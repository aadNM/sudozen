/** src/components/GameBoard.tsx */

import React, { useEffect, useState } from "react";
import { View, TextInput, Button, Alert, TouchableOpacity, Text, Vibration, StyleProp, ViewStyle} from "react-native";
import { isBlockValid, isBlockValidFinal, isPuzzleSolved, validateAgainstSolution } from "../utils/SudokuUtils";
import { useGameScreenStyles } from "../styles/GameScreen.styles";
import { Difficulty, GameBoardProps, getMaxChecks } from "../types/GameTypes";
import storage from "../utils/mmkvStorage";
import { useTheme } from "../context/ThemeContext";
import { useTypography } from "../styles/Typography";
import { useGameBoardStyles } from "../styles/GameBoard.styles";
import { useTranslation } from "react-i18next";


const GameBoard: React.FC<GameBoardProps> = ({ 
  board,
  initialBoard, 
  difficulty, 
  setBoard, 
  onComplete,
  onChangeDifficulty,
  onGetHint,
  onEndGame,
  checksUsed,
  setChecksUsed,
  notes,
  setNotes,
  extraChecks,
  showRewardedChecks
}) => {
  const [checkInput, setCheckInput] = useState("");
  const [activeCell, setActiveCell] = useState<{row: number, col: number} | null>(null);
  const { theme } = useTheme();
  const typography = useTypography();
  const gameScStyles = useGameScreenStyles();
  const dynamicStyles = useGameBoardStyles();
  const [checkedBlock, setCheckedBlock] = useState<number | null>(null);
  const [isCheckInputFocused, setIsCheckInputFocused] = useState(false);
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>(difficulty);
  const [rowColHighlightEnabled, setRowColHighlightEnabled] = useState(
    storage.getBoolean('rowColHighlight') ?? true
  );

  const { t } = useTranslation();

  const translatedDifficulties = [
    { key: "Easy", label: t('settings.difficulties.easy') },
    { key: "Medium", label: t('settings.difficulties.medium') },
    { key: "Hard", label: t('settings.difficulties.hard') },
    { key: "Extreme", label: t('settings.difficulties.extreme') }
  ];

  // Row/Col Highlight
  useEffect(() => {
    const checkSetting = () => {
      const setting = storage.getBoolean('rowColHighlight') ?? true;
      setRowColHighlightEnabled(setting);
    };
    
    checkSetting();
  }, []);

    useEffect(() => {
      const checkDifficulty = () => {
        if (storage.getBoolean('isDailyChallenge')) {
          const storedDifficulty = storage.getString('dailyChallengeDifficulty');
          if (storedDifficulty) {
            setCurrentDifficulty(storedDifficulty as Difficulty);
            return;
          }
        }
        setCurrentDifficulty(difficulty);
      };
      
      checkDifficulty();
    }, [difficulty]); 

  const shouldHighlightRowCol = () => {
    return rowColHighlightEnabled && (difficulty === 'Easy' || difficulty === 'Medium');
  };


  const getDifficultyLabel = (difficultyKey: string) => {
    const difficultyObj = translatedDifficulties.find(d => d.key === difficultyKey);
    return difficultyObj?.label || difficultyKey;
  };

  const isPreFilled = activeCell
    ? initialBoard[activeCell.row][activeCell.col] !== 0
    : false;

  const handleInputChange = (row: number, col: number, value: string) => {
    if (initialBoard[row][col] !== 0) return; 
    if (/^[1-9]?$/.test(value)) {
      const newBoard = board.map((r, rIdx) =>
        r.map((c, cIdx) => (rIdx === row && cIdx === col ? (value === "" ? 0 : Number(value)) : c))
      );
      setBoard(newBoard);
      checkCompletion(newBoard);
    }
  };

  const handleCellPress = (row: number, col: number) => {
    setIsCheckInputFocused(false);
    if (activeCell?.row === row && activeCell?.col === col) {
      setActiveCell(null);
    } else {
      setActiveCell({row, col});
    }
  };

  const checkCompletion = (currentBoard: number[][]) => {
    const isComplete = currentBoard.every(row => 
      row.every(cell => cell !== 0)
    );
    if (isComplete 
        && isPuzzleSolved(currentBoard, storage.getJSON<number[][]>('current_solution'))) {
      onComplete();
    }
  };

  const handleCheck = () => {
    const block = parseInt(checkInput[0], 10) - 1;
    if (isNaN(block) || block < 0 || block > 8) {
      Alert.alert(t('game.check.invalidBlock'));
      return;
    }

    const maxChecks = getMaxChecks(difficulty as Difficulty) + extraChecks;
    if (checksUsed[block] >= maxChecks) {
      Alert.alert(
        t('game.check.noChecksLeft', { block: block + 1 }),
        t('game.check.watchAdPrompt'),
        [
          {
            text: t('game.check.watchAd'),
            onPress: () => showRewardedChecks()
          },
          {
            text: t('common.cancel'),
            style: 'cancel'
          }
        ]
      );
      return;
    }
    

    // Highlight the checked block
    setCheckedBlock(block);
    setTimeout(() => setCheckedBlock(null), 2000); // Remove highlight after 2 seconds

    Alert.alert(isBlockValid(board, block) 
      ? t('game.check.blockCorrect', { block: block + 1 })
      : t('game.check.blockHasMistakes', { block: block + 1 })
    );
    
    Vibration.vibrate(100);
    setChecksUsed((prev: Record<number, number>) => ({
      ...prev,
      [block]: (prev[block] || 0) + 1
    }));
  };

  const getChecksRemaining = (block: number): string => {
    const maxChecks = getMaxChecks(difficulty as Difficulty) + extraChecks;
    const remaining = maxChecks - checksUsed[block];
    return t('game.check.checksRemaining', { 
      block: block + 1, 
      count: remaining,
      countSuffix: remaining !== 1 ? 's' : ''
    });
  };

  return (
    <View style={[gameScStyles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Controls */}
      <View style={{ alignItems: 'center', width: '90%' }}>
        <View style={gameScStyles.topControls}>
          <TouchableOpacity 
            style={dynamicStyles.button} 
            onPress={onChangeDifficulty}
            disabled={storage.getBoolean('isDailyChallenge')}
          >
            <Text style={dynamicStyles.buttonText}>{t('game.difficulty')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={dynamicStyles.button} 
            onPress={onGetHint}
          >
            <Text style={dynamicStyles.buttonText}>{t('game.hint.title')}</Text>
          </TouchableOpacity>

          <View style={[gameScStyles.checkContainer, { flex: 1 }]}>
            <TouchableOpacity
              style={[dynamicStyles.checkInput, isCheckInputFocused && dynamicStyles.checkInputFocus]}
              onPress={() => setIsCheckInputFocused(true)}
            >
              <Text style={[
                 { color: theme.colors.onSurface },
                !checkInput && { color: theme.colors.secondary }
              ]}>
                {checkInput || t('game.check.inputPlaceholder')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={dynamicStyles.button} 
              onPress={() => {
                setIsCheckInputFocused(true);
                handleCheck();
              }}
            >
              <Text style={dynamicStyles.buttonText}>{t('game.check.title')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {activeCell && (
        <View style={dynamicStyles.checksRemainingContainer}>
          <Text style={dynamicStyles.checksRemainingText}>
            {getChecksRemaining(Math.floor(activeCell.row / 3) * 3 + Math.floor(activeCell.col / 3))}
          </Text>
        </View>
      )}
  
      {/* Game Board */}
      <View 
        style={gameScStyles.boardContainer}
        onStartShouldSetResponder={() => {
          setActiveCell(null);
          return false;
        }}
      >
        {board.map((row, rowIndex) => (
          <View key={rowIndex} style={gameScStyles.row}>
            {row.map((cell, colIndex) => {
              const isActiveBlock = activeCell && 
                Math.floor(rowIndex/3) === Math.floor(activeCell.row/3) && 
                Math.floor(colIndex/3) === Math.floor(activeCell.col/3);
              
              const isSameNumber = activeCell && 
                cell !== 0 && 
                cell === board[activeCell.row][activeCell.col];
              
              // Row/Column highlighting logic
              const isInActiveRow = shouldHighlightRowCol() && 
                activeCell && 
                rowIndex === activeCell.row && 
                colIndex !== activeCell.col;
              
              const isInActiveCol = shouldHighlightRowCol() && 
                activeCell && 
                colIndex === activeCell.col && 
                rowIndex !== activeCell.row;

              // Determine if cell was pre-filled or user-filled
              const isPreFilled = initialBoard[rowIndex][colIndex] !== 0; 

              // Check if cell is in the currently checked block
              const blockRow = Math.floor(rowIndex / 3);
              const blockCol = Math.floor(colIndex / 3);
              const currentBlock = blockRow * 3 + blockCol;
              const isCheckedBlock = checkedBlock !== null && currentBlock === checkedBlock;
              
              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[
                    gameScStyles.cell,
                    { backgroundColor: theme.colors.surface },
                    rowIndex % 3 === 2 && rowIndex !== 8 && gameScStyles.bottomBorder,
                    colIndex % 3 === 2 && colIndex !== 8 && gameScStyles.rightBorder,
                    isActiveBlock && dynamicStyles.activeBlock,
                    isSameNumber && dynamicStyles.sameNumberHighlight,
                    // Row/Column highlight styles
                    isInActiveRow && dynamicStyles.rcHighlight,
                    isInActiveCol && dynamicStyles.rcHighlight,
                    isCheckedBlock && { 
                      backgroundColor: theme.colors.tertiary,
                      opacity: 0.7 
                    },
                    // Active cell style should come LAST to override others
                    activeCell?.row === rowIndex && activeCell?.col === colIndex && { 
                      backgroundColor: theme.colors.selectedCell,
                      borderWidth: 2,
                      borderColor: 'white',
                      elevation: 4, // Android shadow
                      shadowColor: '#000', // iOS shadow
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 3,
                    }
                  ]}
                  onPress={() => handleCellPress(rowIndex, colIndex)}
                >
                  {cell !== 0 && (
                    <Text style={[
                      typography.bodyBold,
                      { 
                        color: isPreFilled ? theme.colors.preFilled : theme.colors.userFilled 
                      },
                      isSameNumber && dynamicStyles.sameNumberText,
                      isCheckedBlock && { color: theme.colors.onTertiary }
                    ]}>
                      {cell}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
  
      {/* Number Pad */}
      {(activeCell && !isPreFilled) || isCheckInputFocused ? (
        <View style={dynamicStyles.numPad}>
          {/* Numbers 1-9 for both cell input and check input */}
          {[1,2,3,4,5,6,7,8,9].map((num, idx) => (
            <TouchableOpacity
              key={num}
              style={dynamicStyles.numPadBtn}
              onPress={() => {
                if (isCheckInputFocused) {
                  setCheckInput(num.toString());
                } else if (activeCell) {
                  // For cell input
                  handleInputChange(activeCell.row, activeCell.col, num.toString());
                  setActiveCell(null);
                }
              }}
            >
              <Text style={dynamicStyles.numPadBtnText}>{num}</Text>
            </TouchableOpacity>
          ))}
          
          {/* Erase button - only show when editing a cell */}
          {activeCell && !isPreFilled && (
            <TouchableOpacity
              style={dynamicStyles.deleteBtn}
              onPress={() => {
                handleInputChange(activeCell.row, activeCell.col, "");
                setActiveCell(null);
              }}
            >
              <Text style={dynamicStyles.numPadBtnText}>⌫</Text>
            </TouchableOpacity>
          )}
          
          {/* Hide keypad button */}
          <TouchableOpacity
            style={dynamicStyles.deleteBtn}
            onPress={() => {
              if (isCheckInputFocused) {
                setIsCheckInputFocused(false);
              } else {
                setActiveCell(null);
              }
            }}
          >
            <Text style={dynamicStyles.numPadBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

  
      {/* Notes Section */}
      {((!activeCell || isPreFilled) && !isCheckInputFocused) && (
        <View style={gameScStyles.notesContainer}>
          <Text style={dynamicStyles.notesLabel}>{t('game.gameNotes')}:</Text>
          <TextInput
            style={dynamicStyles.notesTextArea}
            multiline
            numberOfLines={3}
            maxLength={200}
            placeholder={t('game.notesPlaceholder')}
            placeholderTextColor={theme.colors.secondary}
            value={notes}
            textAlignVertical="top"
            scrollEnabled
            onChangeText={(text) => setNotes(text.slice(0, 200))}
          />
        </View>
      )}
  
      {/* Bottom Controls */}
      <View style={gameScStyles.bottomControls}>
        <Text style={dynamicStyles.difficultyText}>
          {t('game.difficultyLabel')}: {getDifficultyLabel(currentDifficulty)}
        </Text>

        <TouchableOpacity 
          onPress={onEndGame} 
          style={dynamicStyles.endGameButton}
        >
          <Text style={dynamicStyles.endGameButtonText}>{t('game.endGame')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default GameBoard;