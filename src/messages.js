const config = require('config')
const {convertJiraKeyToUrl} = require("./utils/helpers");

const slackChannelId = config.get('slack.report_channel_id')
const slackMessageIdRegex = new RegExp(`${slackChannelId}\/(.*)\\|`)
const slackLinkRegex = /view in Slack\|(https:\/\/.+slack\.com.+)]/

function extractSlackMessageIdFromText(text) {
    if (text === undefined) {
        return undefined
    }

    const regexResult = slackMessageIdRegex.exec(text);
    if (regexResult === null) {
        return undefined
    }
    return regexResult[1]
}

function extractSlackLinkFromText(text) {
    if (text === undefined) {
        return undefined
    }

    const regexResult = slackLinkRegex.exec(text);
    if (regexResult === null) {
        return undefined
    }
    return regexResult[1]
}

function stringTrim(string, maxLength) {
    const truncationMessage = '... [Truncated] see Jira for rest of message.';

    if (string.length >= maxLength) {
        return string.slice(0, maxLength - truncationMessage.length).concat(truncationMessage);
    } else {
        return string;
    }
}

function helpRequestRaised({
                               user,
                               summary,
                               environment,
                               service,
                               jiraId
                           }) {
    return [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": summary,
                "emoji": true
            }
        },
        {
            "type": "divider"
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": `*Reporter* \n <@${user}>`
                },
                {
                    "type": "mrkdwn",
                    "text": `*Environment* \n ${environment}`
                },
                {
                    "type": "mrkdwn",
                    "text": `*Service affected* \n ${service}`
                }
            ]
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "*Status*: :large_yellow_circle: Open"
                },
                {
                    "type": "mrkdwn",
                    "text": `*Jira*: <${convertJiraKeyToUrl(jiraId)}|${jiraId}>`
                }
            ]
        },
        {
            "type": "divider"
        },
        {
            "type": "actions",
            "block_id": "actions",
            "elements": [
                {
                    "type": "users_select",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Unassigned",
                        "emoji": true
                    },
                    "action_id": "assign_help_request_to_user"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": ":raising_hand: Take it",
                        "emoji": true
                    },
                    "style": "primary",
                    "value": "assign_help_request_to_me",
                    "action_id": "assign_help_request_to_me"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": ":female-firefighter: Start",
                        "emoji": true
                    },
                    "style": "primary",
                    "value": "start_help_request",
                    "action_id": "start_help_request"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": ":wastebasket: Withdraw",
                        "emoji": true
                    },
                    "style": "primary",
                    "value": "withdraw_help_request",
                    "action_id": "withdraw_help_request"
                }
            ]
        },
        {
            "type": "divider"
        }
    ]
}

function helpRequestDetails(
    {
        description,
        analysis,
        date,
        time
    }) {
    return [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": stringTrim(`:spiral_note_pad: Description: ${description}`, 3000),
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": stringTrim(`:thinking_face: Analysis: ${analysis}`, 3000),
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `:calendar: Occured: ${date} at ${time}`,
            }
        },
    ]
}

module.exports = {
    helpRequestRaised,
    helpRequestDetails,
    extractSlackLinkFromText,
    extractSlackMessageIdFromText
}
