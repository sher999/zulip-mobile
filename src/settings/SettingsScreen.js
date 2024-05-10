/* @flow strict-local */

import React, { useCallback } from 'react';
import type { Node } from 'react';
import { nativeApplicationVersion } from 'expo-application';
import invariant from 'invariant';

import type { RouteProp } from '../react-navigation';
import type { AppNavigationProp } from '../nav/AppNavigator';
import { useSelector, useGlobalSelector, useDispatch } from '../react-redux';
import { getGlobalSettings } from '../selectors';
import NavRow from '../common/NavRow';
import InputRowRadioButtons from '../common/InputRowRadioButtons';
import SwitchRow from '../common/SwitchRow';
import Screen from '../common/Screen';
import {
  IconNotifications,
  IconLanguage,
  IconMoreHorizontal,
  IconSmartphone,
  IconServer,
  IconAlertTriangle,
} from '../common/Icons';
import { setGlobalSettings } from '../actions';
import { shouldUseInAppBrowser } from '../utils/openLink';
import TextRow from '../common/TextRow';
import { getIdentity, getServerVersion } from '../account/accountsSelectors';
import { kMinSupportedVersion, kServerSupportDocUrl } from '../common/ServerCompatBanner';
import { kWarningColor } from '../styles/constants';
import { showErrorAlert } from '../utils/info';
import { TranslationContext } from '../boot/TranslationProvider';
import {
  useNotificationReportsByIdentityKey,
  chooseNotifProblemForShortText,
  notifProblemShortReactText,
  pushNotificationsEnabledEndTimestampWarning,
} from './NotifTroubleshootingScreen';
import { noTranslation } from '../i18n/i18n';
import { keyOfIdentity } from '../account/accountMisc';
import languages from './languages';
import { getRealmName } from '../directSelectors';
import { useDateRefreshedAtInterval } from '../reactUtils';

type Props = $ReadOnly<{|
  navigation: AppNavigationProp<'settings'>,
  route: RouteProp<'settings', void>,
|}>;

export default function SettingsScreen(props: Props): Node {
  const dateNow = useDateRefreshedAtInterval(60_000);

  const theme = useGlobalSelector(state => getGlobalSettings(state).theme);
  const browser = useGlobalSelector(state => getGlobalSettings(state).browser);
  const globalSettings = useGlobalSelector(getGlobalSettings);
  const markMessagesReadOnScroll = globalSettings.markMessagesReadOnScroll;
  const language = useGlobalSelector(state => getGlobalSettings(state).language);

  const perAccountState = useSelector(state => state);
  const expiryWarning = pushNotificationsEnabledEndTimestampWarning(perAccountState, dateNow);

  const zulipVersion = useSelector(getServerVersion);
  const identity = useSelector(getIdentity);
  const notificationReportsByIdentityKey = useNotificationReportsByIdentityKey();
  const notificationReport = notificationReportsByIdentityKey.get(keyOfIdentity(identity));
  invariant(notificationReport, 'SettingsScreen: expected notificationReport');
  const realmName = useSelector(getRealmName);

  const dispatch = useDispatch();
  const _ = React.useContext(TranslationContext);

  const { navigation } = props;

  const handleThemeChange = useCallback(() => {
    dispatch(setGlobalSettings({ theme: theme === 'default' ? 'night' : 'default' }));
  }, [theme, dispatch]);

  return (
    <Screen title="Settings">
      <SwitchRow label="Night mode" value={theme === 'night'} onValueChange={handleThemeChange} />
      <SwitchRow
        label="Open links with in-app browser"
        value={shouldUseInAppBrowser(browser)}
        onValueChange={value => {
          dispatch(setGlobalSettings({ browser: value ? 'embedded' : 'external' }));
        }}
      />
      <InputRowRadioButtons
        navigation={navigation}
        label="Mark messages as read on scroll"
        description="When scrolling through messages, should they automatically be marked as read?"
        valueKey={markMessagesReadOnScroll}
        items={[
          { key: 'always', title: 'Always' },
          { key: 'never', title: 'Never' },
          {
            key: 'conversation-views-only',
            title: 'Only in conversation views',
            subtitle:
              'Messages will be automatically marked as read only when viewing a single topic or direct message conversation.',
          },
        ]}
        onValueChange={value => {
          dispatch(setGlobalSettings({ markMessagesReadOnScroll: value }));
        }}
      />
      <NavRow
        leftElement={{ type: 'icon', Component: IconNotifications }}
        title="Notifications"
        {...(() => {
          const problem = chooseNotifProblemForShortText({ report: notificationReport });
          if (expiryWarning == null && problem == null) {
            return;
          }
          let subtitle = undefined;
          if (problem != null) {
            subtitle = notifProblemShortReactText(problem, realmName);
          } else if (expiryWarning != null) {
            subtitle = expiryWarning.reactText;
          }
          invariant(subtitle != null, 'expected non-null `expiryWarning` or `problem`');
          return {
            leftElement: { type: 'icon', Component: IconAlertTriangle, color: kWarningColor },
            subtitle,
          };
        })()}
        onPress={() => {
          navigation.push('notifications');
        }}
      />
      <InputRowRadioButtons
        icon={{ Component: IconLanguage }}
        navigation={navigation}
        label="Language"
        valueKey={language}
        items={languages.map(l => ({
          key: l.tag,
          title: noTranslation(l.selfname),
          subtitle: l.tag === language ? noTranslation(l.selfname) : l.name,
        }))}
        onValueChange={value => {
          dispatch(setGlobalSettings({ language: value }));
        }}
        search
      />
      <NavRow
        leftElement={{ type: 'icon', Component: IconMoreHorizontal }}
        title="Legal"
        onPress={() => {
          navigation.push('legal');
        }}
      />
      <TextRow
        icon={{ Component: IconSmartphone }}
        title="App version"
        subtitle={noTranslation(`v${nativeApplicationVersion ?? '?.?.?'}`)}
      />
      <TextRow
        icon={{ Component: IconServer }}
        title="Server version"
        subtitle={noTranslation(zulipVersion.raw())}
        {...(!zulipVersion.isAtLeast(kMinSupportedVersion) && {
          icon: { Component: IconAlertTriangle, color: kWarningColor },
          onPress: () => {
            showErrorAlert(
              'Server not supported',
              _({
                text: '{realm} is running Zulip Server {version}, which is unsupported. The minimum supported version is Zulip Server {minSupportedVersion}.',
                values: {
                  realm: identity.realm.toString(),
                  version: zulipVersion.raw(),
                  minSupportedVersion: kMinSupportedVersion.raw(),
                },
              }),
              { url: kServerSupportDocUrl, globalSettings },
            );
          },
        })}
      />
    </Screen>
  );
}
