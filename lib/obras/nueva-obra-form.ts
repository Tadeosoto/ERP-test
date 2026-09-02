export type NuevaObraForm = {
  name: string;
  code: string;
  obraType: string;
  startDate: string;
  estimatedEndDate: string;
  description: string;
  state: string;
  city: string;
  street: string;
  neighborhood: string;
  zipCode: string;
  maxMaterialsBudget: string;
};

export const OBRA_TYPES = [
  "Edificio corporativo",
  "Edificio residencial",
  "Infraestructura vial",
  "Infraestructura industrial",
  "Remodelación",
  "Obra civil",
  "Otro",
];

export const MEXICAN_STATES = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de México",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
];

export function suggestedObraCode(): string {
  const year = new Date().getFullYear();
  const suffix = String(Math.floor(Math.random() * 900) + 100);
  return `OBR-${year}-${suffix}`;
}

/** Mapea campos del modal al modelo Obra existente (sin migración). */
export function nuevaObraToApiPayload(form: NuevaObraForm) {
  const location = [
    form.street.trim(),
    form.neighborhood.trim(),
    form.city.trim(),
    form.state.trim(),
    form.zipCode.trim() && `C.P. ${form.zipCode.trim()}`,
  ]
    .filter(Boolean)
    .join(", ");

  const managerParts = [location && `Ubicación: ${location}`, form.description.trim()].filter(Boolean);

  return {
    name: form.name.trim(),
    code: form.code.trim(),
    client: form.obraType.trim(),
    managerName: managerParts.join(" · "),
    startDate: form.startDate || null,
    estimatedEndDate: form.estimatedEndDate || null,
    maxMaterialsBudget: parseFloat(form.maxMaterialsBudget.replace(/,/g, "")) || 0,
  };
}
