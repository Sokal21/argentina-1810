import { HEAL, STRIKE } from '../machi/abilities';
import type { Hero } from '../machi/data';
import { GRENADE } from '../machi/grenade';
import { MUSKET } from '../machi/musket';

/** What a slot of the HUD says about itself when pointed at. */
export interface Tip {
  name: string;
  /** The key it is on, and what it costs. */
  terms: string;
  says: string;
}

const terms = (key: string, cost: number, what: string, wait: number) => `${key} · ${cost} de ${what} · recarga ${wait} s`;

/** Each hero's skills in the order of their slots, and last their greatest power. */
export const TIPS: Record<Hero, Tip[]> = {
  inti: [
    {
      name: 'Rayo del Pillán',
      terms: terms('Q', STRIKE.cost, 'maná', STRIKE.cooldown),
      says: 'Mantené la tecla para marcar dónde cae y soltala para lanzarlo. Un instante después baja el rayo y daña todo lo que haya en la zona.',
    },
    {
      name: 'Lawen',
      terms: terms('E', HEAL.cost, 'maná', HEAL.cooldown),
      says: 'Un ritual de hierbas: se queda quieta un momento y recupera vida. Si la golpean en el medio, se corta.',
    },
    {
      name: 'Poder mayor',
      terms: 'R · todavía sin definir',
      says: 'Se carga juntando los orbes que dejan los enemigos al caer, antes de que se apaguen.',
    },
  ],
  cabral: [
    {
      name: 'Tiro de mosquete',
      terms: terms('Q', MUSKET.cost, 'furia', MUSKET.cooldown),
      says: 'Mantené la tecla para apuntar y hacé clic para disparar. La bala estalla en el primer enemigo que toca y daña a los que estén cerca.',
    },
    {
      name: 'Granada',
      terms: terms('E', GRENADE.cost, 'furia', GRENADE.cooldown),
      says: 'Mantené la tecla para apuntar y hacé clic para arrojarla. Estalla donde cae y deja el suelo ardiendo: lo que lo pisa se prende fuego.',
    },
    {
      name: 'Furia desatada',
      terms: 'R · se carga a sablazos con la furia llena',
      says: 'Por unos segundos no puede morir, camina y ataca más rápido y quema a quien tenga pegado. Mientras dura pelea solo con el sable.',
    },
  ],
};
