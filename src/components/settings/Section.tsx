import React from 'react';
import { View } from 'react-native';
import ScaledText from '../ScaledText';
import { settingsStyles as styles } from './settingsStyles';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <ScaledText style={styles.sectionLabel}>{title}</ScaledText>
    <View style={styles.card}>{children}</View>
  </View>
);

export default Section;
