import { StaticImageData } from "next/image";

export default interface ProviderInterface {
  id?:string;
  name: string;
  image: StaticImageData | string;
  rating: number;
  description: string;
  reviews: number;
  speciality: string;
  mainSpeciality?: {
    name:string;
  };
  // forAdmin?: boolean;
  user?:{
    name: string;
    image:string;

  }
  role?: string;
  email?: string;
  isProvider?: boolean;
}