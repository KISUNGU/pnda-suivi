// frontend/src/components/common/Motion/motion.tsx
//
// Vocabulaire d'animation du logiciel. Tout passe par ce fichier : une page
// qui anime quelque chose importe d'ici plutôt que de réécrire ses propres
// durées, sinon chaque écran finit avec son propre rythme.
//
// Le mouvement est en ressort (spring), jamais en durée fixe : une tuile qui
// se pose doit avoir un poids, pas un chronomètre. Les trois réglages
// ci-dessous couvrent tous les cas rencontrés jusqu'ici.
//
// Toutes les primitives respectent `prefers-reduced-motion` : le contenu
// apparaît alors immédiatement, à sa position finale.

import React from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import type { HTMLMotionProps, Transition, Variants } from 'framer-motion';
import { Box } from '@mui/material';
import type { BoxProps } from '@mui/material';

/** Réglages de ressort. `ferme` pour les micro-interactions, `ample` pour les entrées de page. */
export const RESSORT = {
  doux: { type: 'spring', stiffness: 210, damping: 26, mass: 0.9 },
  ferme: { type: 'spring', stiffness: 340, damping: 30, mass: 0.7 },
  ample: { type: 'spring', stiffness: 140, damping: 22, mass: 1 },
} satisfies Record<string, Transition>;

/** Décalage entre deux enfants d'une liste échelonnée, en secondes. */
export const ECHELON = 0.055;

/**
 * Fabrique de composants animés, compatible framer-motion 10 et 11+.
 *
 * La v11.11 a remplacé l'appel `motion(Composant)` par `motion.create(...)`.
 * Le dépôt peut encore résoudre une v10 hoistée à la racine, où `create`
 * n'existe pas : on choisit donc l'API disponible au lieu d'en supposer une.
 */
type FabriqueMotion = ((composant: React.ElementType) => React.ComponentType<Record<string, unknown>>) & {
  create?: (composant: React.ElementType) => React.ComponentType<Record<string, unknown>>;
};

export const creerMotion = (composant: React.ElementType) => {
  const fabrique = motion as unknown as FabriqueMotion;
  const cree = typeof fabrique.create === 'function' ? fabrique.create(composant) : fabrique(composant);
  return cree as React.ComponentType<Record<string, unknown>>;
};

const MotionBox = creerMotion(Box) as React.ComponentType<Record<string, unknown>>;

/**
 * MUI et framer-motion déclarent tous deux `onAnimationStart`, `onDrag` et
 * consorts, avec des signatures incompatibles. On retire les gestionnaires DOM
 * de la surface publique : aucune page ne s'en sert, et framer-motion garde
 * les siens.
 */
type PropsBoite = Omit<
  BoxProps,
  'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDrag' | 'onDragStart' | 'onDragEnd'
>;

// ---------------------------------------------------------------------------
// Entrée de page
// ---------------------------------------------------------------------------

/**
 * Enveloppe le contenu d'une page. Le flou de sortie est ce qui donne
 * l'impression que l'écran précédent s'éloigne au lieu de disparaître.
 */
export const varianteEcran: Variants = {
  entree: { opacity: 0, y: 16, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: RESSORT.ample },
  sortie: { opacity: 0, y: -10, filter: 'blur(6px)', transition: { duration: 0.18 } },
};

export const TransitionEcran: React.FC<{ children: React.ReactNode; cle: string }> = ({ children, cle }) => {
  const reduit = useReducedMotion();

  if (reduit) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key={cle} variants={varianteEcran} initial="entree" animate="visible" exit="sortie">
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// ---------------------------------------------------------------------------
// Apparition simple et listes échelonnées
// ---------------------------------------------------------------------------

interface ApparitionProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  children: React.ReactNode;
  /** Retard avant l'apparition, en secondes. */
  retard?: number;
  /** Distance de la montée initiale, en pixels. */
  montee?: number;
}

/** Un bloc qui monte et se révèle. Pour un élément isolé. */
export const Apparition: React.FC<ApparitionProps> = ({ children, retard = 0, montee = 14, ...reste }) => {
  const reduit = useReducedMotion();

  return (
    <motion.div
      initial={reduit ? false : { opacity: 0, y: montee }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...RESSORT.doux, delay: reduit ? 0 : retard }}
      {...reste}
    >
      {children}
    </motion.div>
  );
};

/**
 * Conteneur d'une liste échelonnée. Les enfants doivent être des `<Element>` :
 * le décalage se propage par variantes, sans calcul de retard à la main.
 */
export const Echelonne: React.FC<{ children: React.ReactNode; retard?: number } & PropsBoite> = ({
  children,
  retard = 0,
  ...reste
}) => {
  const reduit = useReducedMotion();

  return (
    <MotionBox
      initial={reduit ? false : 'entree'}
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: reduit ? 0 : ECHELON, delayChildren: retard } },
      }}
      {...reste}
    >
      {children}
    </MotionBox>
  );
};

/** Enfant d'un `<Echelonne>`. */
export const Element: React.FC<{ children: React.ReactNode; montee?: number } & PropsBoite> = ({
  children,
  montee = 16,
  ...reste
}) => (
  <MotionBox
    variants={{
      entree: { opacity: 0, y: montee },
      visible: { opacity: 1, y: 0, transition: RESSORT.doux },
    }}
    {...reste}
  >
    {children}
  </MotionBox>
);

// ---------------------------------------------------------------------------
// Micro-interactions
// ---------------------------------------------------------------------------

/**
 * Surface qui réagit au survol et au clic. Le soulèvement est volontairement
 * faible : sur une grille de douze tuiles, 4 px suffisent à désigner celle
 * qu'on pointe sans faire tressauter la page.
 */
export const Interactive: React.FC<{ children: React.ReactNode; actif?: boolean } & PropsBoite> = ({
  children,
  actif = true,
  ...reste
}) => {
  const reduit = useReducedMotion();

  return (
    <MotionBox
      whileHover={actif && !reduit ? { y: -4, transition: RESSORT.ferme } : undefined}
      whileTap={actif && !reduit ? { scale: 0.985, transition: RESSORT.ferme } : undefined}
      {...reste}
    >
      {children}
    </MotionBox>
  );
};

// ---------------------------------------------------------------------------
// Chiffres
// ---------------------------------------------------------------------------

interface NombreAnimeProps {
  valeur: number;
  /** Décimales à afficher. */
  decimales?: number;
  suffixe?: string;
  prefixe?: string;
}

/**
 * Compteur qui rejoint sa valeur au lieu de l'afficher d'un coup. Utilisé sur
 * les tuiles de synthèse : le mouvement dit « ce chiffre vient d'être calculé »
 * et attire l'œil sur la ligne qui a changé depuis la dernière visite.
 */
export const NombreAnime: React.FC<NombreAnimeProps> = ({ valeur, decimales = 0, suffixe = '', prefixe = '' }) => {
  const reduit = useReducedMotion();
  const brut = useMotionValue(0);
  const lisse = useSpring(brut, { stiffness: 90, damping: 22, mass: 0.8 });
  const texte = useTransform(lisse, (v) =>
    `${prefixe}${v.toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}${suffixe}`,
  );

  React.useEffect(() => {
    brut.set(valeur);
  }, [valeur, brut]);

  if (reduit) {
    return (
      <>
        {prefixe}
        {valeur.toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}
        {suffixe}
      </>
    );
  }

  return <motion.span>{texte}</motion.span>;
};

export { motion, AnimatePresence, useReducedMotion };
