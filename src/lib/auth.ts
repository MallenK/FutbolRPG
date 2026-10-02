import { betterAuth } from "better-auth"
import { anonymous } from "better-auth/plugins"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"
import { user, session, account, verification } from "./schema"
import { sendVerificationEmail, sendResetPasswordEmail } from "./email"
import { migrarDatosDeInvitado } from "./guest-migration"

// Google solo se activa si hay credenciales — así el login normal sigue
// funcionando sin romperse mientras no se configuren en Vercel.
const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // no bloquea el login de cuentas ya existentes
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, user.name, url)
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, user.name, url)
    },
  },
  ...(googleEnabled ? {
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
  } : {}),
  // "Continuar como invitado" (login/page.tsx) -- sesión real de Better Auth
  // pero marcada isAnonymous:true, para poder excluirla de ranking/actividad
  // (ver requireRealAccount en src/lib/session.ts) sin tratarla como un login normal.
  plugins: [
    anonymous({
      generateName: () => "Invitado",
      // Registrarse desde una sesión de invitado conserva la carrera jugada.
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await migrarDatosDeInvitado(anonymousUser.user.id, newUser.user.id)
      },
    }),
  ],
  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
    },
    deleteUser: {
      enabled: true,
    },
    additionalFields: {
      isPremium: { type: "boolean", input: false, defaultValue: false },
      stripeCustomerId: { type: "string", input: false, required: false },
    },
  },
  // Límite de peticiones. Better Auth lo activa solo en producción y con
  // valores por defecto implícitos; aquí se fija explícitamente y se apaga en
  // los tests e2e, que hacen muchos registros seguidos contra la misma IP.
  // El almacén es en memoria: en Vercel cada instancia lleva su propia cuenta,
  // así que frena la fuerza bruta pero no es un límite global exacto.
  rateLimit: {
    enabled: process.env.E2E_TEST_MODE !== "1",
    window: 60,
    max: 120,
    customRules: {
      "/sign-up/email": { window: 60, max: 5 },
      "/sign-in/email": { window: 60, max: 10 },
      "/forget-password": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
    },
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
})
