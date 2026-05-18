import { pgTable, serial, text, timestamp, real, integer } from 'drizzle-orm/pg-core';

export const laporan = pgTable('laporan', {
  id_laporan: serial('id_laporan').primaryKey(),
  kode_unik: text('kode_unik').notNull().unique(),
  email: text('email').notNull(),
  tanggal: timestamp('tanggal').defaultNow().notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  alamat: text('alamat'), // To hold wilayah.id returned address
  gambar: text('gambar').notNull(),
  deskripsi: text('deskripsi'),
  rds_score: real('rds_score').notNull(),
  status: text('status').default('pending').notNull(),
});

export const deteksi = pgTable('deteksi', {
  id_deteksi: serial('id_deteksi').primaryKey(),
  id_laporan: integer('id_laporan').references(() => laporan.id_laporan).notNull(),
  kelas: text('kelas').notNull(),
  confidence_score: real('confidence_score').notNull(),
  bbox_x: real('bbox_x').notNull(),
  bbox_y: real('bbox_y').notNull(),
  bbox_width: real('bbox_width').notNull(),
  bbox_height: real('bbox_height').notNull(),
  image_index: integer('image_index').default(0).notNull(),
});

