import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index";
import { laporan, deteksi } from "./src/db/schema";
import { eq, desc } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

// Setup Nodemailer (Real SMTP or Ethereal test account)
let transporter: nodemailer.Transporter | null = null;

if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log("Real SMTP configured for feedback emails.");
} else {
  nodemailer.createTestAccount().then(account => {
    transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass,
      },
    });
    console.log("Test SMTP (Ethereal) configured for demo.");
  }).catch(console.error);
}

async function sendFeedbackEmail(toEmail: string, reportId: string | number) {
  if (!transporter) return;
  try {
    const info = await transporter.sendMail({
      from: '"JALUR" <noreply@jalur.local>',
      to: toEmail,
      subject: "Laporan Kerusakan Jalan Diterima - JALUR",
      text: `Terima kasih! Laporan kerusakan jalan Anda dengan ID #${reportId} telah kami terima dan akan segera direview.`,
      html: `<h3>Terima kasih atas kontribusi Anda!</h3><p>Laporan kerusakan jalan Anda dengan ID <b>#${reportId}</b> telah kami terima dan akan segera direview oleh admin kami.</p>`
    });
    
    if (!process.env.SMTP_USER) {
      console.log("Feedback email sent. Preview:", nodemailer.getTestMessageUrl(info));
    } else {
      console.log(`Feedback email sent to ${toEmail}`);
    }
  } catch (err) {
    console.error("Failed to send email", err);
  }
}

async function getWilayahAddress(lat: number, lon: number): Promise<string> {
  try {
    // Implementing Wilayah / Administrative info fetch using Nominatim 
    // as an alternative since specific wilayah.id API requires auth/keys
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`, {
      headers: {
        'User-Agent': 'JALUR/1.0'
      }
    });
    if (response.ok) {
      const data = await response.json();
      return data.display_name || 'Tidak diketahui';
    }
  } catch (err) {
    console.error("Reverse geocode error:", err);
  }
  return 'Tidak diketahui';
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '150mb' }));

  // API Routes
  app.get("/api/reports", async (req, res) => {
    try {
      if (!db) {
        return res.json([]); // Return empty if db not configured
      }

      const data = await db.select().from(laporan).orderBy(desc(laporan.tanggal));

      const reportsWithDetections = await Promise.all(data.map(async (report) => {
        const dets = await db.select().from(deteksi).where(eq(deteksi.id_laporan, report.id_laporan));
        // map field names to match frontend types
        return {
          id: report.id_laporan,
          kodeUnik: report.kode_unik,
          email: report.email,
          createdAt: report.tanggal,
          latitude: report.latitude,
          longitude: report.longitude,
          imageUrl: report.gambar,
          deskripsi: report.deskripsi,
          rdsScore: report.rds_score,
          status: report.status,
          address: report.alamat,
          detections: dets.map(d => ({
            class: d.kelas,
            confidence: d.confidence_score,
            image_index: d.image_index,
            bbox: { x: d.bbox_x, y: d.bbox_y, width: d.bbox_width, height: d.bbox_height }
          }))
        };
      }));

      res.json(reportsWithDetections);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // Helper function for geofencing (Kemang, Bogor)
  const isWithinKemang = (lat: number, lng: number) => {
    return lat >= -6.5400 && lat <= -6.4850 && lng >= 106.7200 && lng <= 106.7800;
  };

  app.post("/api/reports", async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: "Database not configured. Please add DATABASE_URL to .env" });
      }

      const { email, latitude, longitude, images, deskripsi } = req.body;

      if (!isWithinKemang(latitude, longitude)) {
        return res.status(400).json({ error: "Laporan ditolak. Hanya area Kecamatan Kemang, Kabupaten Bogor yang diperbolehkan." });
      }

      const kodeUnik = `LAP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Handle both new array format and legacy single image format
      const gambarStr = images ? JSON.stringify(images) : "[]";

      // Save Report immediately to prevent slow UI (Reverse geocode in background)
      const [report] = await db.insert(laporan).values({
        kode_unik: kodeUnik,
        email,
        latitude,
        longitude,
        alamat: 'Sedang melacak lokasi...',
        gambar: gambarStr,
        deskripsi,
        rds_score: 0,
        tanggal: new Date(),
        status: 'pending'
      }).returning();

      // Run slow tasks in the background
      (async () => {
        try {
          const alamat = await getWilayahAddress(latitude, longitude);
          if (alamat && alamat !== 'Tidak diketahui') {
            await db.update(laporan).set({ alamat }).where(eq(laporan.id_laporan, report.id_laporan));
          }
          await sendFeedbackEmail(email, report.kode_unik);
        } catch (bgError) {
          console.error("Background task error:", bgError);
        }
      })();

      res.json({ 
        success: true, 
        report: { 
          id: report.id_laporan,
          kodeUnik: report.kode_unik,
          email: report.email,
          createdAt: report.tanggal,
          latitude: report.latitude,
          longitude: report.longitude,
          imageUrl: report.gambar,
          deskripsi: report.deskripsi,
          rdsScore: report.rds_score,
          status: report.status,
          address: report.alamat,
          detections: [] 
        } 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create report" });
    }
  });

  app.post("/api/reports/:id/detect", async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: "No DB" });
      const { id } = req.params;
      
      const [report] = await db.select().from(laporan).where(eq(laporan.id_laporan, Number(id)));
      if (!report) return res.status(404).json({ error: "Report not found" });

      let rawDetections: any[] = [];
      const apiKey = process.env.ULTRALYTICS_API_KEY;
      if (!apiKey) {
        throw new Error("ULTRALYTICS_API_KEY is not set");
      }

      const yoloUrl = "https://predict-69fefbdb869dd01551bd-dproatj77a-et.a.run.app/predict";
      
      let images: string[] = [];
      try {
        images = JSON.parse(report.gambar);
        if (!Array.isArray(images)) images = [report.gambar];
      } catch (e) {
        images = [report.gambar];
      }

      for (let i = 0; i < images.length; i++) {
        const imgData = images[i];
        if (!imgData || !imgData.includes(",")) continue;

        const base64Data = imgData.split(",")[1];
        const mimeType = imgData.split(";")[0].split(":")[1] || "image/jpeg";
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: mimeType });

        const formData = new FormData();
        formData.append("file", blob, `image_${i}.jpg`);
        formData.append("conf", "0.25");
        formData.append("iou", "0.7");
        formData.append("imgsz", "640");

        try {
          const yoloResponse = await fetch(yoloUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
            },
            body: formData,
          });

          if (!yoloResponse.ok) {
            console.error(`Detection failed for image ${i}: ${yoloResponse.statusText}`);
            continue;
          }

          const yoloData = await yoloResponse.json() as any;
          
          if (yoloData.images && yoloData.images.length > 0) {
             const results = yoloData.images[0].results || [];
             const imageDetections = results.map((det: any) => {
               const width = det.box.x2 - det.box.x1;
               const height = det.box.y2 - det.box.y1;
               return {
                 class: det.name || "unknown",
                 confidence: det.confidence,
                 image_index: i,
                 bbox: {
                   x: det.box.x1,
                   y: det.box.y1,
                   width: width,
                   height: height
                 }
               };
             });
             rawDetections = [...rawDetections, ...imageDetections];
          }
        } catch (err) {
          console.error(`Error processing image ${i}`, err);
        }
      }

      const weights: Record<string, number> = {
        'pothole': 10,
        'linear crack': 5,
        'alligator crack': 7
      };
      
      const penalty = rawDetections.reduce((acc: number, det: any) => acc + (weights[det.class] || 0), 0);
      const rdsScore = Math.max(0, 100 - penalty);

      await db.update(laporan).set({ rds_score: rdsScore }).where(eq(laporan.id_laporan, Number(id)));

      if (rawDetections.length > 0) {
        await db.delete(deteksi).where(eq(deteksi.id_laporan, Number(id)));
        await db.insert(deteksi).values(rawDetections.map((d: any) => ({
          id_laporan: Number(id),
          kelas: d.class,
          confidence_score: d.confidence,
          bbox_x: d.bbox.x,
          bbox_y: d.bbox.y,
          bbox_width: d.bbox.width,
          bbox_height: d.bbox.height,
          image_index: d.image_index || 0
        })));
      }

      res.json({ success: true, rdsScore, detections: rawDetections });
    } catch (error: any) {
      console.error("Detect Endpoint Error:", error.message || error);
      res.status(400).json({ error: error.message || "Gagal melakukan deteksi kerusakan. Pastikan API Key valid atau server YOLO aktif." });
    }
  });

  app.put("/api/reports/:id/status", async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: "No DB" });
      const { id } = req.params;
      const { status } = req.body;
      
      await db.update(laporan).set({ status }).where(eq(laporan.id_laporan, Number(id)));
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Public tracking endpoint
  app.get("/api/reports/track/:kode", async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: "No DB" });
      const { kode } = req.params;
      const [report] = await db.select().from(laporan).where(eq(laporan.kode_unik, kode.toUpperCase()));
      if (!report) return res.status(404).json({ error: "Laporan tidak ditemukan" });

      const dets = await db.select().from(deteksi).where(eq(deteksi.id_laporan, report.id_laporan));
      res.json({
        kodeUnik: report.kode_unik,
        status: report.status,
        rdsScore: report.rds_score,
        createdAt: report.tanggal,
        address: report.alamat,
        detectionsCount: dets.length,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to track report" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
