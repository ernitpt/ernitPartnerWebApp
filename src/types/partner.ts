export type PartnerUserRecord = {
  userType: "partner";
  isAdmin: boolean;
  name: string;
  createdFromInvite: string;
  createdAt?: any;
  email?: string;
  mapsUrl?: string;
  emailVerified?: boolean;
  onboardedAt?: any;
  updatedAt?: any;
  status?: string;
};
