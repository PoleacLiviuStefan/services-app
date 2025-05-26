import { StaticImageData } from "next/image"

// 1. Interfața de bază pentru orice user
export interface UserInterface {
  id?: string
  name: string
  image: StaticImageData | string
  email?: string
  role?: string       // ex: "ADMIN" | "STANDARD"
  isProvider?: boolean
}