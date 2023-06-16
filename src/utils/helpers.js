function convertIso8601ToEpochSeconds(isoTime) {
    if (isoTime === undefined) {
        return undefined
    }

    return Date.parse(isoTime) / 1000
}

function extractSlackLinkFromText(text) {
    if (text === undefined) {
        return undefined
    }

    const slackLinkRegex = /view in Slack\|(https:\/\/.+slack\.com.+)]/
    const regexResult = slackLinkRegex.exec(text);
    if (regexResult === null) {
        return undefined
    }
    return regexResult[1]
}

function convertJiraKeyToUrl(jiraId) {
    return `https://tools.hmcts.net/jira/browse/${jiraId}`;
}

/**
 * The built in string replace function can't return a promise
 * This is an adapted version that is able to do that
 * Source: https://stackoverflow.com/a/48032528/4951015
 *
 * @param str source string
 * @param regex the regex to apply to the string
 * @param asyncFn function to transform the string with, arguments should include match and any capturing groups
 * @returns {Promise<*>} result of the replace
 */
async function replaceAsync(str, regex, asyncFn) {
    const promises = [];
    str.replace(regex, (match, ...args) => {
        const promise = asyncFn(match, ...args);
        promises.push(promise);
    });
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift());
}

/**
 * Users may have a display name set or may not.
 * Display name is normally better than real name, so we prefer that but fallback to real name.
 */
function convertProfileToName(profile) {
    let name = profile.display_name_normalized
    if (!name) {
        name = profile.real_name_normalized;
    }
    return name;
}

const title = (summary) => {
    return {
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": `*${summary}*`,
        }
    }
}

const jiraView = (jiraId) => {
    return  {
        "type": "context",
        "elements": [
            {
                "type": "mrkdwn",
                "text": `View on Jira: <${convertJiraKeyToUrl(jiraId)}|${jiraId}>`
            }
        ]
    }
}

const action = () => {
    return {
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
            button(":raising_hand: Take it", "assign_help_request_to_me"),
            button(":female-firefighter: Start", "start_help_request"),
            button(":broom: Withdraw", "withdraw_help_request")
        ]
    }
}

const button = (text, action) => {
    return {
        "type": "button",
        "text": {
            "type": "plain_text",
            "text": text,
            "emoji": true
        },
        "style": "primary",
        "value": action,
        "action_id": action
    }
}

const textField = (text) => {
    return {
        "type": "mrkdwn",
        "text": text
    }
}

module.exports = {
    convertIso8601ToEpochSeconds,
    extractSlackLinkFromText,
    convertJiraKeyToUrl,
    title,
    jiraView,
    action,
    button,
    textField,
    replaceAsync,
    convertProfileToName
}

