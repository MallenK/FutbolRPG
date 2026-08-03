import { randomBytes } from "crypto"

export const createId = (): string => randomBytes(12).toString("hex")
