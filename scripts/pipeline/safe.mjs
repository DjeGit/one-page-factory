// Masque les secrets avant d'écrire un message dans un journal, un email ou une colonne `error` de la base.
// Les clés d'API ne devraient jamais s'y trouver (elles voyagent dans des en-têtes), mais une réponse d'erreur d'un service
// ou une adresse complète peut les répéter : mieux vaut un filet de sécurité.

const SECRET_NAME = /KEY|SECRET|TOKEN|PASSWORD|PASSWD|SALT/i;

/** @param {unknown} text  @param {Record<string,string|undefined>} [env] */
export function redact(text, env = process.env) {
  let s = String(text ?? '');
  for (const [name, value] of Object.entries(env || {})) {
    if (SECRET_NAME.test(name) && typeof value === 'string' && value.trim().length >= 8) s = s.split(value.trim()).join('[masqué]');
  }
  return s
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[masqué]')
    .replace(/\bsk-[A-Za-z0-9_-]{20,}/g, '[masqué]')
    .replace(/([?&](?:key|api_key|apikey|access_token|token|sign|signature)=)[^&\s"']+/gi, '$1[masqué]')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/g, '$1[masqué]');
}
