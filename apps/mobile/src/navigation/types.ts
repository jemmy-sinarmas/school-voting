export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyOtp: { email: string };
  ForgotPassword: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Vote: undefined;
  CandidateDetail: { candidateId: string; listId: string; roleId?: string };
  Winners: undefined;
  Settings: undefined;
  ChangePassword: undefined;
  Tutorial: undefined;
};
