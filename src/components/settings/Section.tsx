import React from 'react';
import { View } from 'react-native';
import ScaledText from '../ScaledText';
import { useSettingsStyles } from './settingsStyles';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => {
  const styles = useSettingsStyles();
  return (
    <View style={styles.section}>
      <ScaledText style={styles.sectionLabel}>{title}</ScaledText>
      <View style={styles.card}>{children}</View>
    </View>
  );
};

export default Section;
