import React from 'react';
import Mosaic from './Mosaic';

type DuetMosaicProps = Omit<React.ComponentProps<typeof Mosaic>, 'layout'>;

/**
 * Two-person mosaic: one horizontal row with one equal-width cell per person.
 */
export default function DuetMosaic(props: DuetMosaicProps) {
  return <Mosaic {...props} layout="duet" />;
}
