import { redirect } from "next/navigation";

// "Minha conta" agora fica em Ajustes.
export default function AccountPage() {
  redirect("/ajustes");
}
