/** /src/screens/TutorialScreen.tsx */

import React from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useStrategies } from '../hooks/UseStrategies';
import { useGlobalStyles } from '../styles/Global.styles';
import { Strategy, StrategyCategory } from '../types/GameTypes';
import { useTheme } from '../context/ThemeContext';
import { useTypography } from '../styles/Typography';
import { useTranslation } from 'react-i18next';
import { SudokuBanner } from '../hooks/ads/Banner';



const TutorialScreen = () => {
  const { theme } = useTheme();
  const { strategies, loading } = useStrategies({ purpose: 'tutorial' });
  const [index, setIndex] = React.useState(0);
  const globalStyles = useGlobalStyles();
  const typography = useTypography();
  const { t } = useTranslation();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    strategyCard: {
      marginBottom: 20,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      elevation: 2,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    difficultyTag: {
      color: theme.colors.primary,
      fontWeight: 'bold',
      marginBottom: 8,
      fontSize: 14,
    },
    strategyTitle: {
      ...typography.title,
      marginBottom: 8,
    },
    strategyDesc: {
      ...typography.body,
      marginBottom: 12,
      lineHeight: 24,
      color: theme.colors.onSurface,
    },
    exampleContainer: {
      backgroundColor: theme.colors.background + '20', // Add opacity
      padding: 12,
      borderRadius: 6,
      marginTop: 8,
    },
    exampleText: {
      fontStyle: 'italic',
      color: theme.colors.secondary,
      fontSize: 14,
    },
    scrollContainer: {
      padding: 16,
      backgroundColor: theme.colors.background,
    }
  });

  const [routes] = React.useState([
    { key: 'basic', title: t('tutorial.basic') },
    { key: 'intermediate', title: t('tutorial.intermediate') },
    { key: 'advanced', title: t('tutorial.advanced') },
  ]);

  const StrategyCard = ({ strategy }: { strategy: Strategy }) => (
    <View style={styles.strategyCard}>
      <Text style={styles.difficultyTag}>{strategy.category}</Text>
      <Text style={styles.strategyTitle}>{strategy.title}</Text>
      <Text style={styles.strategyDesc}>{strategy.description}</Text>
      {strategy.examples?.length > 0 && (
        <View style={styles.exampleContainer}>
          {strategy.examples.map((ex, idx) => (
            <Text key={idx} style={styles.exampleText}>
              {ex}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  const renderScene = SceneMap({
    basic: () => (
      <ScrollView style={styles.scrollContainer}>
        {strategies
          .filter(s => s.category === 'Basic')
          .map(strategy => (
            <StrategyCard key={strategy.id} strategy={strategy} />
          ))}
      </ScrollView>
    ),
    intermediate: () => (
      <ScrollView style={styles.scrollContainer}>
        {strategies
          .filter(s => s.category === 'Intermediate')
          .map(strategy => (
            <StrategyCard key={strategy.id} strategy={strategy} />
          ))}
      </ScrollView>
    ),
    advanced: () => (
      <ScrollView style={styles.scrollContainer}>
        {strategies
          .filter(s => s.category === 'Advanced')
          .map(strategy => (
            <StrategyCard key={strategy.id} strategy={strategy} />
          ))}
      </ScrollView>
    ),
  });

  if (loading) {
    return (
      <View style={globalStyles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{ 
        backgroundColor: theme.colors.primary, 
        height: 3 
      }}
      style={{ 
        backgroundColor: theme.colors.surface,
      }}
      labelStyle={{
        color: theme.colors.primary,
        fontWeight: 'bold',
        textTransform: 'capitalize',
        fontSize: 14,
      }}
      inactiveColor={theme.colors.secondary} 
      activeColor={theme.colors.primary}
    />
  );

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        renderTabBar={renderTabBar}
      />
      <SudokuBanner />
    </View>
  );
};

export default TutorialScreen;