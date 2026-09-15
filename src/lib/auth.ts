import { betterAuth } from "better-auth"
import { anonymous } from "better-auth/plugins"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"
import { user, session, account, verification } from "./schema"
import { sendVerificationEmail, sendResetPasswordEmail } from "./email"

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
  plugins: [anonymous({ generateName: () => "Invitado" })],
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
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
})
