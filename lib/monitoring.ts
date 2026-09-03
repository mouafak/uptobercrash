import { serverEnv } from '@/config/env';

/**
 * Journalisation et alertes.
 *
 * Une ligne structurée par appel d'écriture : en cas de litige, c'est la seule
 * trace exploitable. Et une alerte sortante sur ce qui ne devrait pas arriver,
 * pour que l'incident se découvre en deux minutes plutôt qu'en deux jours.
 */

type Fields = Record<string, unknown>;

function emit(level: 'info' | 'error', scope: string, fields: Fields): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scope,
    ...fields,
  });

  if (level === 'error') console.error(line);
  else console.log(line);
}

export function logInfo(scope: string, fields: Fields): void {
  emit('info', scope, fields);
}

export function logError(scope: string, fields: Fields): void {
  emit('error', scope, fields);
}

/**
 * Envoie une alerte, sans jamais faire échouer la requête qui l'a déclenchée :
 * un webhook injoignable ne doit pas transformer un incident en panne.
 * Muette si `ALERT_WEBHOOK_URL` n'est pas renseignée.
 */
export function sendAlert(title: string, fields: Fields): void {
  const url = serverEnv.ALERT_WEBHOOK_URL;
  if (url === undefined) return;

  const content = `🚨 ${title}\n\`\`\`json\n${JSON.stringify(fields, null, 2)}\n\`\`\``;

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Discord attend `content`, Telegram attend `text` : envoyer les deux
    // évite d'avoir à savoir lequel est branché.
    body: JSON.stringify({ content, text: content }),
  }).catch((error: unknown) => {
    logError('alert', {
      message: "webhook d'alerte injoignable",
      cause: error instanceof Error ? error.message : String(error),
    });
  });
}
