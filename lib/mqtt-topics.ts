/**
 * MQTT Topic Helpers pour Kidoo
 * Functions stateless uniquement (pas de connexion MQTT persistante)
 * Utilisé pour calculer les topics standardisés
 */

/**
 * Nettoyer une adresse MAC pour le format MQTT
 * Entrée: "AA:BB:CC:DD:EE:FF" ou "AABBCCDDEEFF" ou "aa-bb-cc-dd-ee-ff"
 * Sortie: "AABBCCDDEEFF"
 */
export function cleanMac(mac: string): string {
  return mac.replace(/[:-]/g, '').toUpperCase();
}

/**
 * Obtenir le topic de commande pour un device
 * Format: kidoo/{MAC}/cmd
 * Ex: kidoo/80B54ED96148/cmd
 */
export function getMqttCmdTopic(macAddress: string): string {
  const cleanedMac = cleanMac(macAddress);
  return `kidoo/${cleanedMac}/cmd`;
}

/**
 * Obtenir le topic de télémétrie pour un device
 * Format: kidoo/{MAC}/telemetry
 * Ex: kidoo/80B54ED96148/telemetry
 */
export function getMqttTelemetryTopic(macAddress: string): string {
  const cleanedMac = cleanMac(macAddress);
  return `kidoo/${cleanedMac}/telemetry`;
}
