import { normalize } from "@/lib/server/teacher-match";

type CannedRule = { pattern: RegExp; reply: string };

const RULES: CannedRule[] = [
  {
    pattern: /^(bonjour|salut|slt|hello|bonsoir|hey|coucou)\b/,
    reply: "Bonjour 👋 Je suis l'assistant ProfySpace. Dites-moi ce que vous cherchez (matière, niveau scolaire, budget, ville, en ligne ou présentiel) et je vous propose les meilleurs professeurs.",
  },
  {
    pattern: /merci|thanks|thx/,
    reply: "Avec plaisir 😊 Autre chose ? Vous pouvez préciser une matière, un niveau ou un budget à tout moment.",
  },
  {
    pattern: /au revoir|bye|a bientot|a plus/,
    reply: "À bientôt sur ProfySpace ! Bonne réussite dans vos études 🎓",
  },
  {
    pattern: /qui es tu|c'est quoi ce chat|que fais tu|tu es qui|es tu une ia|es tu un robot/,
    reply: "Je suis l'assistant de recherche de ProfySpace 🤖. Je vous aide à trouver le professeur particulier le plus adapté parmi ceux déjà vérifiés sur la plateforme, selon la matière, le niveau, le budget et la disponibilité que vous me donnez.",
  },
  {
    pattern: /comment (ca marche|ça marche|fonctionne|reserver|réserver)|comment faire pour reserver/,
    reply: "C'est simple : décrivez votre besoin ici, je vous recommande des professeurs avec un score de compatibilité, vous cliquez sur \"Voir le profil\" puis \"Réserver\" pour choisir un créneau et confirmer le paiement.",
  },
  {
    pattern: /classe virtuelle|cours en ligne comment|visio|webcam/,
    reply: "Les cours en ligne se déroulent dans une classe virtuelle HD directement dans votre navigateur (aucune installation), avec tableau blanc interactif et partage de documents.",
  },
  {
    pattern: /(prix|tarif|combien ca coute|combien ça coûte)\b/,
    reply: "Chaque professeur fixe son propre tarif horaire (affiché sur son profil). Filtrez par budget ici et je ne vous montre que les profs qui correspondent.",
  },
  {
    pattern: /paiement|payer|d17|flouci|recharge|virement/,
    reply: "Vous pouvez recharger votre compte par D17 (La Poste), Flouci Wallet ou virement bancaire, puis payer vos séances directement depuis votre solde ProfySpace.",
  },
  {
    pattern: /devenir prof|candidature prof|rejoindre.*(profs|enseignant)|postuler.*prof/,
    reply: "Pour devenir professeur sur ProfySpace, cliquez sur \"Devenir professeur\" dans le menu, remplissez votre dossier avec vos diplômes et tarifs — notre équipe valide les profils sous 24h.",
  },
  {
    pattern: /gratuit|sans payer|essai gratuit/,
    reply: "La recherche et la mise en relation sont gratuites. Vous ne payez que les séances que vous réservez, au tarif fixé par chaque professeur.",
  },
  {
    pattern: /contact|support|assistance|probleme|réclamation|reclamation/,
    reply: "Notre équipe support est disponible par email à profyspace@gmail.com, 7j/7. Vous pouvez aussi utiliser la bulle de discussion en bas à droite.",
  },
];

/**
 * Only fires when the message reads as small talk/FAQ with no
 * teacher-search signal of its own — a message that mixes a greeting with
 * actual search criteria ("bonjour, je cherche un prof de maths") should
 * still go through the matching flow instead of getting a canned reply.
 */
export function detectCannedReply(rawMessage: string): string | null {
  const message = normalize(rawMessage);
  for (const rule of RULES) {
    if (rule.pattern.test(message)) return rule.reply;
  }
  return null;
}
