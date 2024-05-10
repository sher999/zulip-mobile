/* @flow strict-local */
import React from 'react';
import type { Node } from 'react';
import { View } from 'react-native';

import ZulipTextIntl from '../common/ZulipTextIntl';
import { Icon } from '../common/Icons';
import styles from '../styles';

const specials = {
  home: { name: 'Combined feed', icon: 'globe' },
  private: { name: 'Direct messages', icon: 'mail' },
  starred: { name: 'Starred', icon: 'star' },
  mentioned: { name: 'Mentions', icon: 'at-sign' },
};

type Props = $ReadOnly<{|
  code: 'home' | 'private' | 'starred' | 'mentioned',
  color: string,
|}>;

export default function TitleSpecial(props: Props): Node {
  const { code, color } = props;
  const { name, icon } = specials[code];

  return (
    <View style={styles.navWrapper}>
      <Icon name={icon} size={20} color={color} style={styles.halfPaddingRight} />
      <ZulipTextIntl style={[styles.navTitle, { flex: 1, color }]} text={name} />
    </View>
  );
}
