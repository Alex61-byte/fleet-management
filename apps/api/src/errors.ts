export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errors = {
  validation: (message = "Invalid request.") =>
    new AppError(400, "validation_error", message),
  passwordTooShort: () =>
    new AppError(400, "password_too_short", "Password must be at least 8 characters."),
  resetInvalid: () =>
    new AppError(400, "reset_invalid", "This reset link is not valid."),
  inviteInvalid: () =>
    new AppError(400, "invite_invalid", "This invitation is not valid."),
  emailNotInvited: () =>
    new AppError(400, "email_not_invited", "This email does not match the invitation."),
  totpNotPending: () =>
    new AppError(400, "totp_not_pending", "Authenticator setup is not pending."),
  unauthenticated: () =>
    new AppError(401, "unauthenticated", "Sign in is required."),
  invalidCredentials: () =>
    new AppError(401, "invalid_credentials", "Sign-in details are not correct."),
  totpInvalid: () =>
    new AppError(401, "totp_invalid", "That code is not valid."),
  forbidden: () =>
    new AppError(403, "forbidden", "You cannot perform this action."),
  loginDisabled: () =>
    new AppError(403, "login_disabled", "This driver cannot sign in."),
  notFound: () =>
    new AppError(404, "not_found", "Not found."),
  emailInUse: () =>
    new AppError(409, "email_in_use", "This email cannot be used."),
  inviteNotPending: () =>
    new AppError(409, "invite_not_pending", "This driver has already accepted their invitation."),
  rateLimited: () =>
    new AppError(429, "rate_limited", "Too many attempts. Try again later."),
  storageUnavailable: () =>
    new AppError(503, "storage_unavailable", "Image storage is unavailable."),
  handoverNoActiveTravel: () =>
    new AppError(
      409,
      "handover_no_active_travel",
      "Select a vehicle for next travel before handover.",
    ),
  handoverVehicleOpen: () =>
    new AppError(409, "handover_vehicle_open", "This vehicle already has an open handover out."),
  handoverDriverOpen: () =>
    new AppError(409, "handover_driver_open", "You already have an open handover out."),
  handoverNoOpenOut: () =>
    new AppError(409, "handover_no_open_out", "There is no open handover out to close."),
  handoverWrongDriver: () =>
    new AppError(
      409,
      "handover_wrong_driver",
      "Only the driver who took the vehicle out can hand it back in.",
    ),
  dailyUsageNoActiveTravel: () =>
    new AppError(
      409,
      "daily_usage_no_active_travel",
      "Select a vehicle for next travel before logging daily usage.",
    ),
  dailyUsageAlreadyOpen: () =>
    new AppError(
      409,
      "daily_usage_already_open",
      "Finish End of Day on your open daily usage before starting another.",
    ),
  dailyUsageNoOpen: () =>
    new AppError(
      409,
      "daily_usage_no_open",
      "Start the day before logging End of Day.",
    ),
};
