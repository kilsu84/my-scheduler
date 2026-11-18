import { pgTable, text, timestamp, boolean, serial, date } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

export const schedules = pgTable('schedules', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  rawText: text('rawText').notNull(),
  title: text('title').notNull(),
  customerName: text('customerName'),
  categories: text('categories').array().notNull().default([]),
  startAt: timestamp('startAt', { withTimezone: true }).notNull(),
  endAt: timestamp('endAt', { withTimezone: true }),
  allDay: boolean('allDay').notNull().default(false),
  done: boolean('done').notNull().default(false),
  googleEventId: text('googleEventId'),
  syncStatus: text('syncStatus').notNull().default('pending'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
})

export const todos = pgTable('todos', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  done: boolean('done').notNull().default(false),
  dueDate: date('dueDate', { mode: 'string' }).notNull(),
  priority: text('priority').notNull().default('normal'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
})

export type Schedule = typeof schedules.$inferSelect
export type Todo = typeof todos.$inferSelect
