import { VerificationFragment } from "@govtechsg/oa-verify";
import { OpenAttestationDocument, utils } from "@govtechsg/open-attestation";
import { useEffect } from "react";
import ReactGA from "react-ga4";

import { isPDT, isVac, isREC } from "@utils/notarise-healthcerts";

export enum DOCUMENT_TYPE {
  PDT = "PDT",
  VAC = "VAC",
  REC = "REC",
  OA_V2 = "OA_V2",
  OA_V3 = "OA_V3", // OA v3 currently not supported by verify.gov.sg
  UNKNOWN = "UNKNOWN",
}

export enum EVENT_CATEGORY {
  VERIFIED = "certificate_verified",
  ERROR = "certificate_error",
}

export const getDocumentType = (data: OpenAttestationDocument): DOCUMENT_TYPE => {
  if (isVac(data)) {
    return DOCUMENT_TYPE.VAC;
  } else if (isPDT(data)) {
    return DOCUMENT_TYPE.PDT;
  } else if (isREC(data)) {
    return DOCUMENT_TYPE.REC;
  } else if (utils.isRawV2Document(data)) {
    return DOCUMENT_TYPE.OA_V2;
  } else if (utils.isRawV3Document(data)) {
    return DOCUMENT_TYPE.OA_V3;
  } else {
    return DOCUMENT_TYPE.UNKNOWN;
  }
};

/**
 * Initialise Google Analytics 4 only once (if GTAG_ID is provided)
 *
 * The ReactGA.send("pageview") is explicitly called afterwards because
 * the pageview event is not automatically triggered on first initialisation
 * but will be automatically triggered by the GA script on subsequent page views.
 */
export const useGoogleAnalytics = (): void => {
  useEffect(() => {
    try {
      const GTAG_ID = process.env.NEXT_PUBLIC_GTAG_ID;
      if (GTAG_ID?.startsWith("G-")) {
        ReactGA.initialize(GTAG_ID);
        ReactGA.send("pageview");
      }
    } catch (e) {
      console.error(e);
    }
  }, []);
};

export const sendSuccessfulVerificationEvent = (data: OpenAttestationDocument): void => {
  if (utils.isRawV3Document(data)) return; // OA v3 currently not supported by verify.gov.sg

  try {
    ReactGA.event(EVENT_CATEGORY.VERIFIED, {
      document_id: data.id || "",
      document_type: getDocumentType(data),
      issuer_identity_location: data.issuers[0].identityProof?.location || "",
      template_name: typeof data.$template === "string" ? data.$template : data.$template?.name || "",
      template_url: typeof data.$template === "string" ? data.$template : data.$template?.url || "",
    });
  } catch (e) {
    console.error(e);
  }
};

export const sendUnsuccessfulVerificationEvent = (
  data: OpenAttestationDocument,
  fragments: VerificationFragment[]
): void => {
  if (utils.isRawV3Document(data)) return; // OA v3 currently not supported by verify.gov.sg

  const message = JSON.stringify(fragments.filter(({ status }) => status === "ERROR" || status === "INVALID")).replace(
    /[\[\]"]/g,
    ""
  );

  try {
    ReactGA.event(EVENT_CATEGORY.ERROR, {
      document_id: data.id || "",
      document_type: getDocumentType(data),
      issuer_identity_location: data.issuers[0].identityProof?.location || "",
      template_name: typeof data.$template === "string" ? data.$template : data.$template?.name || "",
      template_url: typeof data.$template === "string" ? data.$template : data.$template?.url || "",
      errors: message,
    });
  } catch (e) {
    console.error(e);
  }
};
