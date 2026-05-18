CREATE TABLE "deteksi" (
	"id_deteksi" serial PRIMARY KEY NOT NULL,
	"id_laporan" integer NOT NULL,
	"kelas" text NOT NULL,
	"confidence_score" real NOT NULL,
	"bbox_x" real NOT NULL,
	"bbox_y" real NOT NULL,
	"bbox_width" real NOT NULL,
	"bbox_height" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "laporan" (
	"id_laporan" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"tanggal" timestamp DEFAULT now() NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"alamat" text,
	"gambar" text NOT NULL,
	"rds_score" real NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deteksi" ADD CONSTRAINT "deteksi_id_laporan_laporan_id_laporan_fk" FOREIGN KEY ("id_laporan") REFERENCES "public"."laporan"("id_laporan") ON DELETE no action ON UPDATE no action;