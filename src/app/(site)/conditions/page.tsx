import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/site/legal-page";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.legal.termsTitle };
}

const FR: LegalSection[] = [
  {
    title: "Le service",
    paragraphs: [
      "Bold Up met en relation des coachs sportifs indépendants et des personnes qui souhaitent s'entraîner. Bold Up n'est ni l'employeur des coachs ni partie au contrat conclu entre un coach et son client : chaque coach exerce sous sa propre responsabilité.",
    ],
  },
  {
    title: "Comptes",
    items: [
      "Vous devez fournir des informations exactes et garder votre mot de passe confidentiel.",
      "Un compte est personnel. Vous êtes responsable de l'activité réalisée depuis votre compte.",
      "Nous pouvons suspendre un compte en cas d'abus, de fraude ou de non-respect des présentes conditions.",
    ],
  },
  {
    title: "Coachs : vérification",
    paragraphs: [
      "Pour être publié, un coach transmet des justificatifs professionnels, notamment sa carte professionnelle d'éducateur sportif et une attestation d'assurance responsabilité civile professionnelle. Une pré-vérification automatique contrôle uniquement la forme du fichier. La validation est ensuite faite par une personne de notre équipe.",
      "La mention « Vérifié » signifie que les justificatifs transmis ont été examinés par notre équipe à la date de validation. Elle ne constitue pas une garantie sur la qualité des séances. Le coach reste seul responsable de la validité de ses qualifications, de ses déclarations et de son assurance, et doit signaler tout changement.",
    ],
  },
  {
    title: "Demandes de séance",
    items: [
      "Une demande de séance n'est confirmée qu'après acceptation par le coach.",
      "Les tarifs affichés sont fixés par le coach et donnés à titre indicatif.",
      "Aucun paiement n'est encaissé par Bold Up dans cette version : le règlement se fait directement entre le client et le coach.",
      "Chacun peut annuler une séance avant son début ; merci de prévenir le plus tôt possible.",
    ],
  },
  {
    title: "Salles et lieux",
    paragraphs: [
      "Certaines fiches de salles sont créées à partir de données publiques (OpenStreetMap) et portent la mention « Fiche publique ». Elles n'impliquent aucun partenariat avec Bold Up. Seules les fiches marquées « Partenaire Bold Up » correspondent à un accord avec le lieu. Un gérant peut demander la mise à jour ou le retrait de sa fiche.",
    ],
  },
  {
    title: "Bon usage",
    items: [
      "Restez courtois dans vos messages.",
      "N'utilisez pas la plateforme pour du démarchage, du contenu illicite ou trompeur.",
      "Ne publiez que des photos et des contenus dont vous détenez les droits.",
    ],
  },
  {
    title: "Santé et sécurité",
    paragraphs: [
      "La pratique sportive comporte des risques. Assurez-vous que votre état de santé vous permet de pratiquer l'activité choisie et signalez toute contre-indication à votre coach.",
    ],
  },
  {
    title: "Droit applicable",
    paragraphs: ["Les présentes conditions sont soumises au droit français. Les mentions légales complètes de l'éditeur seront ajoutées avant l'ouverture au public."],
  },
];

const EN: LegalSection[] = [
  {
    title: "The service",
    paragraphs: [
      "Bold Up connects independent sports coaches with people who want to train. Bold Up is neither the coaches' employer nor a party to the contract between a coach and their client: each coach works under their own responsibility.",
    ],
  },
  {
    title: "Accounts",
    items: [
      "You must provide accurate information and keep your password confidential.",
      "An account is personal. You are responsible for activity carried out from your account.",
      "We may suspend an account in case of abuse, fraud or breach of these terms.",
    ],
  },
  {
    title: "Coaches: verification",
    paragraphs: [
      "To be published, a coach submits professional documents, including their French professional sports educator card and a professional liability insurance certificate. An automatic pre-check only looks at the form of the file. Approval is then given by a member of our team.",
      "\"Verified\" means the documents submitted were examined by our team on the approval date. It is not a guarantee of session quality. The coach remains solely responsible for the validity of their qualifications, statements and insurance, and must report any change.",
    ],
  },
  {
    title: "Session requests",
    items: [
      "A session request is only confirmed once the coach accepts it.",
      "Prices shown are set by the coach and are indicative.",
      "Bold Up collects no payment in this version: payment is made directly between the client and the coach.",
      "Either side may cancel a session before it starts; please give as much notice as possible.",
    ],
  },
  {
    title: "Gyms and venues",
    paragraphs: [
      "Some gym listings are created from public data (OpenStreetMap) and are labelled \"Public listing\". They imply no partnership with Bold Up. Only listings marked \"Bold Up partner\" reflect an agreement with the venue. A manager can ask for their listing to be updated or removed.",
    ],
  },
  {
    title: "Fair use",
    items: [
      "Stay courteous in your messages.",
      "Don't use the platform for solicitation, or for unlawful or misleading content.",
      "Only publish photos and content you hold the rights to.",
    ],
  },
  {
    title: "Health and safety",
    paragraphs: ["Sport involves risks. Make sure your health allows you to practise the chosen activity and tell your coach about any contraindication."],
  },
  {
    title: "Governing law",
    paragraphs: ["These terms are governed by French law. The publisher's full legal notice will be added before the public launch."],
  },
];

export default async function TermsPage() {
  const { t, locale } = await getI18n();
  return <LegalPage title={t.admin.legal.termsTitle} updated={t.admin.legal.updated} notice={t.admin.legal.draftNotice} sections={locale === "fr" ? FR : EN} />;
}
