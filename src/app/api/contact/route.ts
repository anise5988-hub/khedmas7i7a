import { NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/lib/server/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Tous les champs sont obligatoires." }, { status: 400 });
    }

    if (typeof name !== "string" || typeof email !== "string" || typeof subject !== "string" || typeof message !== "string") {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (trimmedName.length < 2 || trimmedEmail.length < 5 || trimmedSubject.length < 3 || trimmedMessage.length < 10) {
      return NextResponse.json({ error: "Veuillez remplir tous les champs correctement." }, { status: 400 });
    }

    const supportEmail = process.env.PROFY_SUPPORT_EMAIL || "profyspace@gmail.com";
    const emailSent = await sendTransactionalEmail({
      to: supportEmail,
      name: trimmedName,
      subject: `[ProfySpace Contact] ${trimmedSubject}`,
      title: `Nouveau message de contact - ${trimmedSubject}`,
      message: `De: ${trimmedName} <${trimmedEmail}>\n\n${trimmedMessage}`,
    });

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "Votre message a été transmis avec succès. Notre équipe vous répondra sous 24h."
        : "Votre message a été enregistré. Notre équipe vous répondra sous 24h.",
    });
  } catch (error) {
    console.error("Contact form error", error);
    return NextResponse.json({ error: "Impossible d'envoyer le message. Veuillez réessayer." }, { status: 500 });
  }
}
