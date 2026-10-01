import { eq } from "drizzle-orm"
import { txDb } from "./db"
import { activityLog, legado, player, transferListing, transferOffer } from "./schema"

// Cuando un invitado crea una cuenta real (o entra en una existente), Better
// Auth borra el usuario anónimo, y por el ON DELETE CASCADE se llevaba por
// delante su jugador, su legado y su actividad: el invitado perdía toda la
// carrera justo al registrarse. Aquí se traspasa todo al usuario nuevo antes
// de ese borrado.
//
// Si la cuenta de destino ya tiene un jugador (inicio de sesión en una cuenta
// existente), se conserva el de la cuenta: solo puede haber uno por usuario.
export async function migrarDatosDeInvitado(anonUserId: string, newUserId: string): Promise<void> {
  if (anonUserId === newUserId) return
  await txDb().transaction(async (tx) => {
    const destino = await tx.select({ id: player.id }).from(player).where(eq(player.userId, newUserId)).limit(1)
    if (destino.length === 0) {
      await tx.update(player).set({ userId: newUserId, updatedAt: new Date() }).where(eq(player.userId, anonUserId))
      await tx.update(activityLog).set({ userId: newUserId }).where(eq(activityLog.userId, anonUserId))
      await tx.update(transferListing).set({ userId: newUserId }).where(eq(transferListing.userId, anonUserId))
      await tx.update(transferOffer).set({ fromUserId: newUserId }).where(eq(transferOffer.fromUserId, anonUserId))
    }
    // El legado (carreras ya retiradas) se suma siempre: no choca con nada.
    await tx.update(legado).set({ userId: newUserId }).where(eq(legado.userId, anonUserId))
  })
}
