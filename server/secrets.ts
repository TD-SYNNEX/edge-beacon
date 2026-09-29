import type { ServerEnv } from "../shared/types.ts";

/**
 * Loads the combined provider-keys secret (OPENAI_API_KEY, TYPESAFE_API_KEY)
 * once per Lambda execution environment and merges it into env in place.
 * A no-op in local dev / Vite / npm start, where those keys already come
 * from .env — SECRETS_ARN is only set by the CDK Lambda config.
 */
let loaded: Promise<void> | undefined;

export function loadSecrets(env: ServerEnv): Promise<void> {
  if (!env.SECRETS_ARN) return Promise.resolve();
  loaded ??= (async () => {
    const { SecretsManagerClient, GetSecretValueCommand } =
      await import("@aws-sdk/client-secrets-manager");
    const client = new SecretsManagerClient({ region: env.COGNITO_REGION });
    const result = await client.send(
      new GetSecretValueCommand({ SecretId: env.SECRETS_ARN }),
    );
    // Falls back to no keys on anything unparseable (e.g. the auto-generated
    // random string CDK's Secret construct sets before anyone has put a
    // real {OPENAI_API_KEY, TYPESAFE_API_KEY} JSON value on it) rather than
    // crashing every request until the secret is populated.
    let secret: unknown = {};
    try {
      secret = JSON.parse(result.SecretString || "{}");
    } catch {
      /* not valid JSON yet — AI/Jev stay off until a real value is set */
    }
    if (typeof secret === "object" && secret !== null) {
      const { OPENAI_API_KEY, TYPESAFE_API_KEY } = secret as Record<
        string,
        unknown
      >;
      if (typeof OPENAI_API_KEY === "string")
        env.OPENAI_API_KEY = OPENAI_API_KEY;
      if (typeof TYPESAFE_API_KEY === "string")
        env.TYPESAFE_API_KEY = TYPESAFE_API_KEY;
    }
  })();
  return loaded;
}
