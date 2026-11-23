// Figurinhas e reações do Quiz do Território
export const FIGURINHAS = [
  { id: 'casa', e: '🏠', nome: 'Casa', g: 'Território' },
  { id: 'bairro', e: '🏘️', nome: 'Bairro', g: 'Território' },
  { id: 'praca', e: '🌳', nome: 'Praça', g: 'Território' },
  { id: 'escola', e: '🏫', nome: 'Escola', g: 'Território' },
  { id: 'bike', e: '🚲', nome: 'Bicicleta', g: 'Território' },
  { id: 'mapa', e: '🗺️', nome: 'Mapa', g: 'Território' },
  { id: 'mochila', e: '🎒', nome: 'Mochila do ACS', g: 'Cuidado (ACS)' },
  { id: 'visita', e: '📋', nome: 'Visita', g: 'Cuidado (ACS)' },
  { id: 'vacina', e: '💉', nome: 'Vacina', g: 'Cuidado (ACS)' },
  { id: 'coracao', e: '❤️', nome: 'Coração', g: 'Cuidado (ACS)' },
  { id: 'bebe', e: '👶', nome: 'Bebê', g: 'Cuidado (ACS)' },
  { id: 'vovo', e: '👵', nome: 'Vovó', g: 'Cuidado (ACS)' },
  { id: 'mosquito', e: '🦟', nome: 'Caça-mosquito', g: 'Ambiente (APA)' },
  { id: 'agua', e: '💧', nome: 'Água limpa', g: 'Ambiente (APA)' },
  { id: 'recicla', e: '♻️', nome: 'Reciclagem', g: 'Ambiente (APA)' },
  { id: 'muda', e: '🌱', nome: 'Muda', g: 'Ambiente (APA)' },
  { id: 'pet', e: '🐕', nome: 'Pet', g: 'Ambiente (APA)' },
  { id: 'sol', e: '🌞', nome: 'Sol', g: 'Ambiente (APA)' },
  { id: 'fruta', e: '🍎', nome: 'Fruta', g: 'Vida saudável' },
  { id: 'verdura', e: '🥦', nome: 'Verdura', g: 'Vida saudável' },
  { id: 'caminhada', e: '👟', nome: 'Caminhada', g: 'Vida saudável' },
  { id: 'sorriso', e: '🦷', nome: 'Sorriso', g: 'Vida saudável' },
  { id: 'forca', e: '💪', nome: 'Força', g: 'Vida saudável' },
  { id: 'parceria', e: '🤝', nome: 'Parceria', g: 'Vida saudável' },
];
export const REACOES = ['👏', '❤️', '😂', '😮', '🔥', '🙌'];
const BY = Object.fromEntries(FIGURINHAS.map((f) => [f.id, f]));
export const figEmoji = (id) => (BY[id] ? BY[id].e : '🙂');
export const figValid = (id) => !!BY[id];
export const randomFig = () => FIGURINHAS[Math.floor(Math.random() * FIGURINHAS.length)].id;

export function figPicker(selected) {
  const groups = [...new Set(FIGURINHAS.map((f) => f.g))];
  return groups.map((g) => `<div class="figgroup"><div class="figlabel">${g}</div><div class="figgrid">${
    FIGURINHAS.filter((f) => f.g === g).map((f) => `<button type="button" class="fig${f.id === selected ? ' on' : ''}" data-fig="${f.id}" aria-pressed="${f.id === selected}" aria-label="${f.nome}" title="${f.nome}">${f.e}</button>`).join('')
  }</div></div>`).join('');
}
