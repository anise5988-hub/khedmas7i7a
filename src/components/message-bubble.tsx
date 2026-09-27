"use client";

import { memo } from "react";
import { CustomOffer } from "@/lib/server/chat-store";

/**
 * Une bulle de message, mémoïsée.
 *
 * Avant, la liste des messages était un `.map()` directement dans le composant
 * de page : chaque frappe au clavier, chaque ouverture de modale ou chaque
 * mise à jour de sondage re-rendait *toutes* les bulles, y compris celles qui
 * n'avaient pas bougé. Sur un fil de 80 messages et un téléphone d'entrée de
 * gamme, c'est exactement ce qui rend la saisie pâteuse. Avec `memo`, une
 * bulle n'est re-rendue que si son message ou son état (moi / en attente)
 * change réellement.
 */

export type ChatMessageView = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: "STUDENT" | "TEACHER" | "ADMIN";
  text: string;
  createdAt: Date | string;
  offer?: CustomOffer | null;
};

function MessageBubbleBase({
  message,
  isMe,
  isSystem,
  canRespondToOffer,
  onAcceptOffer,
  onRejectOffer,
}: {
  message: ChatMessageView;
  isMe: boolean;
  isSystem: boolean;
  /** Un élève ne peut répondre qu'aux offres en attente qui lui sont destinées. */
  canRespondToOffer: boolean;
  onAcceptOffer: (offer: CustomOffer) => void;
  onRejectOffer: (offer: CustomOffer) => void;
}) {
  if (isSystem) {
    return (
      <div className="py-2 text-center">
        <span className="inline-block rounded-full bg-slate-100 px-4 py-1.5 text-[11px] font-semibold text-slate-500">
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
      <span className="mb-1 px-1 text-[10px] font-bold text-slate-400">{message.senderName}</span>
      <div
        className={`max-w-[85%] rounded-3xl p-4 text-xs leading-relaxed ${
          isMe ? "rounded-br-xs bg-[#11233f] text-white shadow-sm" : "rounded-bl-xs bg-slate-100 text-slate-800"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>

        {message.offer && (
          <div className="mt-3 space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0d8d78]">
                Offre Sur-Mesure
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                  message.offer.status === "ACCEPTED"
                    ? "bg-emerald-100 text-emerald-700"
                    : message.offer.status === "REJECTED"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {message.offer.status === "ACCEPTED"
                  ? "✓ Acceptée"
                  : message.offer.status === "REJECTED"
                  ? "✕ Refusée"
                  : "En attente"}
              </span>
            </div>

            <div>
              <p className="text-sm font-bold text-[#11233f]">{message.offer.subject}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span>Durée : {message.offer.durationMinutes} min</span>
                <span>
                  Date :{" "}
                  {new Date(message.offer.startsAt).toLocaleDateString("fr-TN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2">
              <span className="text-xs text-slate-500">Tarif proposé :</span>
              <span className="text-base font-extrabold text-[#0d8d78]">{message.offer.amountTnd} DT</span>
            </div>

            {canRespondToOffer && message.offer.status === "PENDING" && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => onAcceptOffer(message.offer!)}
                  className="flex-1 rounded-xl bg-[#0d8d78] py-2 text-center text-xs font-bold text-white transition hover:bg-[#0b7866]"
                >
                  Accepter l&apos;offre ({message.offer.amountTnd} DT) →
                </button>
                <button
                  onClick={() => onRejectOffer(message.offer!)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                >
                  Refuser
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <span className="mt-1 px-1 text-[9px] text-slate-400">
        {new Date(message.createdAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleBase);