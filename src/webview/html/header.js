/* @flow strict-local */
import template from './template';
import type { HeaderMessageListElement } from '../../types';
import type { BackgroundData } from '../MessageList';
import {
  streamNarrow,
  topicNarrow,
  pmNarrowFromRecipients,
  keyFromNarrow,
} from '../../utils/narrow';
import { foregroundColorFromBackground } from '../../utils/color';
import { humanDate } from '../../utils/date';
import {
  pmUiRecipientsFromMessage,
  pmKeyRecipientsFromMessage,
  streamNameOfStreamMessage,
} from '../../utils/recipient';
import { base64Utf8Encode } from '../../utils/encoding';

const renderSubject = message =>
  // TODO: pin down if '' happens, and what its proper semantics are.
  message.match_subject !== undefined && message.match_subject !== ''
    ? message.match_subject
    : template`${message.subject}`;

/**
 * The HTML string for a message-list element of the "header" type.
 *
 * This is a private helper of messageListElementHtml.
 */
export default (
  { ownUser, subscriptions }: BackgroundData,
  element: HeaderMessageListElement,
): string => {
  const { subsequentMessage: message, style: headerStyle } = element;

  if (message.type === 'stream' && headerStyle === 'topic+date') {
    const streamName = streamNameOfStreamMessage(message);
    const topicNarrowStr = keyFromNarrow(topicNarrow(streamName, message.subject));
    const topicHtml = renderSubject(message);

    return template`
<div
  class="header-wrapper header topic-header"
  data-narrow="${base64Utf8Encode(topicNarrowStr)}"
  data-msg-id="${message.id}"
>
  <div class="topic-text">$!${topicHtml}</div>
  <div class="topic-date">${humanDate(new Date(message.timestamp * 1000))}</div>
</div>
    `;
  }

  if (message.type === 'stream' && headerStyle === 'full') {
    const streamName = streamNameOfStreamMessage(message);
    const stream = subscriptions.find(x => x.name === streamName);

    const backgroundColor = stream ? stream.color : 'hsl(0, 0%, 80%)';
    const textColor = foregroundColorFromBackground(backgroundColor);
    const streamNarrowStr = keyFromNarrow(streamNarrow(streamName));
    const topicNarrowStr = keyFromNarrow(topicNarrow(streamName, message.subject));
    const topicHtml = renderSubject(message);

    return template`
<div class="header-wrapper header stream-header topic-header"
    data-msg-id="${message.id}"
    data-narrow="${base64Utf8Encode(topicNarrowStr)}">
  <div class="header stream-text"
       style="color: ${textColor};
              background: ${backgroundColor}"
       data-narrow="${base64Utf8Encode(streamNarrowStr)}">
    # ${streamName}
  </div>
  <div class="topic-text">$!${topicHtml}</div>
  <div class="topic-date">${humanDate(new Date(message.timestamp * 1000))}</div>
</div>
    `;
  }

  if (message.type === 'private' && headerStyle === 'full') {
    const keyRecipients = pmKeyRecipientsFromMessage(message, ownUser.user_id);
    const narrowObj = pmNarrowFromRecipients(keyRecipients);
    const narrowStr = keyFromNarrow(narrowObj);

    const uiRecipients = pmUiRecipientsFromMessage(message, ownUser.user_id);
    return template`
<div class="header-wrapper private-header header"
     data-narrow="${base64Utf8Encode(narrowStr)}"
     data-msg-id="${message.id}">
  ${uiRecipients
    .map(r => r.full_name)
    .sort()
    .join(', ')}
</div>
`;
  }

  return '';
};
