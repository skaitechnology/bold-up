import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/site/legal-page";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.legal.privacyTitle };
}

const FR: LegalSection[] = [
  {
    title: "Qui traite vos données ?",
    paragraphs: [
      "Bold Up est une plateforme de mise en relation entre des coachs sportifs indépendants et des particuliers. L'éditeur du service est responsable du traitement des données décrites ci-dessous. Ses coordonnées complètes et celles de son contact « protection des données » seront indiquées ici avant l'ouverture au public.",
    ],
  },
  {
    title: "Les données que nous collectons",
    items: [
      "Compte : nom, adresse e-mail, mot de passe (stocké chiffré par notre prestataire d'authentification), langue.",
      "Profil sportif (facultatif) : ville, sports qui vous intéressent, niveau, objectif.",
      "Profil coach : nom affiché, photo, présentation, spécialités, tarifs, ville et rayon d'intervention, disponibilités, qualifications déclarées.",
      "Justificatifs professionnels des coachs : carte professionnelle, attestation d'assurance, diplômes. Ces documents sont stockés dans un espace privé.",
      "Activité : demandes de séance, messages échangés, coachs mis en favoris, notifications.",
      "Données techniques strictement nécessaires : cookies de session et de langue, adresse IP utilisée pour limiter les abus.",
    ],
  },
  {
    title: "Pourquoi nous les utilisons",
    items: [
      "Fournir le service : créer votre compte, afficher les profils, transmettre vos demandes et vos messages (exécution du contrat).",
      "Vérifier les coachs : contrôler les justificatifs avant d'afficher la mention « Vérifié » (intérêt légitime à protéger les utilisateurs, obligations liées à l'encadrement sportif).",
      "Sécuriser la plateforme : prévenir la fraude et les abus (intérêt légitime).",
    ],
    paragraphs: ["Nous ne vendons pas vos données et nous n'utilisons aucun traceur publicitaire."],
  },
  {
    title: "Votre position",
    paragraphs: [
      "La recherche fonctionne sans géolocalisation. Si vous choisissez « Autour de moi », votre position est utilisée dans votre navigateur pour trier les résultats ; elle n'est ni enregistrée sur votre profil ni montrée à d'autres personnes. Pour les coachs, seule une zone approximative autour de leur ville est affichée, jamais une adresse.",
    ],
  },
  {
    title: "Qui peut voir quoi",
    items: [
      "Le profil public d'un coach validé est visible par tous.",
      "Les messages ne sont visibles que par les deux personnes concernées.",
      "Les justificatifs d'un coach ne sont accessibles qu'à lui-même et à l'équipe de validation, par des liens sécurisés à durée limitée.",
      "Un coach voit le nom des personnes qui lui écrivent ou lui demandent une séance, pas leurs autres informations.",
    ],
  },
  {
    title: "Hébergement et sous-traitants",
    paragraphs: [
      "L'application est hébergée par Vercel et les données par Supabase, dans une région située dans l'Union européenne (Paris). Les fonds de carte proviennent d'OpenFreeMap et d'OpenStreetMap, la recherche de villes de la Base adresse nationale.",
    ],
  },
  {
    title: "Durées de conservation",
    items: [
      "Compte et profil : tant que le compte est actif, puis suppression ou anonymisation après une demande de suppression.",
      "Justificatifs professionnels : pendant la durée d'activité du coach sur la plateforme ; un document remplacé ou supprimé par le coach est effacé du stockage.",
      "Demandes de séance et messages : pendant la durée du compte.",
    ],
    paragraphs: ["Les durées exactes seront arrêtées avec notre conseil avant l'ouverture au public."],
  },
  {
    title: "Vos droits",
    paragraphs: [
      "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Vous pouvez modifier vos informations depuis « Mon compte » et y demander la suppression de votre compte. Vous pouvez aussi introduire une réclamation auprès de la CNIL (cnil.fr).",
    ],
  },
];

const EN: LegalSection[] = [
  {
    title: "Who processes your data?",
    paragraphs: [
      "Bold Up is a platform connecting independent sports coaches with individuals. The publisher of the service is the controller of the data described below. Its full contact details, and those of its data protection contact, will be listed here before the public launch.",
    ],
  },
  {
    title: "The data we collect",
    items: [
      "Account: name, email address, password (stored hashed by our authentication provider), language.",
      "Sport profile (optional): town, sports you're interested in, level, goal.",
      "Coach profile: display name, photo, introduction, specialities, prices, town and travel radius, availability, stated qualifications.",
      "Coaches' professional documents: professional card, insurance certificate, diplomas. These documents are stored in a private space.",
      "Activity: session requests, messages, favourite coaches, notifications.",
      "Strictly necessary technical data: session and language cookies, IP address used to limit abuse.",
    ],
  },
  {
    title: "Why we use it",
    items: [
      "To provide the service: create your account, display profiles, deliver your requests and messages (performance of the contract).",
      "To verify coaches: check supporting documents before showing the \"Verified\" label (legitimate interest in protecting users, obligations relating to sports instruction).",
      "To secure the platform: prevent fraud and abuse (legitimate interest).",
    ],
    paragraphs: ["We don't sell your data and we don't use any advertising trackers."],
  },
  {
    title: "Your location",
    paragraphs: [
      "Search works without geolocation. If you choose \"Near me\", your position is used in your browser to sort results; it is neither saved on your profile nor shown to anyone else. For coaches, only an approximate area around their town is displayed, never an address.",
    ],
  },
  {
    title: "Who can see what",
    items: [
      "An approved coach's public profile is visible to everyone.",
      "Messages are only visible to the two people involved.",
      "A coach's documents are only accessible to that coach and to the review team, through secure, short-lived links.",
      "A coach sees the name of the people who message them or request a session, not their other details.",
    ],
  },
  {
    title: "Hosting and processors",
    paragraphs: [
      "The application is hosted by Vercel and the data by Supabase, in a region located in the European Union (Paris). Map tiles come from OpenFreeMap and OpenStreetMap, and town search from the French national address base.",
    ],
  },
  {
    title: "Retention",
    items: [
      "Account and profile: as long as the account is active, then deletion or anonymisation after a deletion request.",
      "Professional documents: for as long as the coach is active on the platform; a document replaced or deleted by the coach is removed from storage.",
      "Session requests and messages: for the lifetime of the account.",
    ],
    paragraphs: ["Exact retention periods will be set with our counsel before the public launch."],
  },
  {
    title: "Your rights",
    paragraphs: [
      "You have the right to access, rectify, erase, restrict, object to and port your data. You can edit your details in \"My account\" and request deletion of your account there. You can also lodge a complaint with the French data protection authority, the CNIL (cnil.fr).",
    ],
  },
];

export default async function PrivacyPage() {
  const { t, locale } = await getI18n();
  return <LegalPage title={t.admin.legal.privacyTitle} updated={t.admin.legal.updated} notice={t.admin.legal.draftNotice} sections={locale === "fr" ? FR : EN} />;
}
