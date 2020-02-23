const debug = require('debug')('github-events')

const githubSecret = require('./github-secret')

module.exports = (app, events) => {
  app.post('/hooks/github', (req, res) => {
    const event = req.headers['x-github-event']
    if (!event) {
      res.writeHead(400, 'Event Header Missing')
      return res.end()
    }

    if (!githubSecret.isValid(req)) {
      res.writeHead(401, 'Invalid Signature')
      req.log.error('Invalid GitHub event signature, returning 401')
      return res.end()
    }

    const data = req.body
    data.action = data.action ? event + '.' + data.action : event

    app.emitGhEvent(data, req.log, events)
      .then(() => res.end(), (err) => {
        req.log.error(err, 'Error raised from one or more of the event listeners')
        res.status(500).end()
      })
  })

  app.emitGhEvent = function emitGhEvent (data, logger, eventsEmitter) {
    const repo = data.repository.name
    const org = data.repository.owner.login || data.organization.login

    // Normalize how to fetch the PR / issue number for simpler retrieval in the
    // rest of the bot's code. For PRs the number is present in data.number,
    // but for webhook events raised for comments it's present in data.issue.number
    if (!data.number && data.issue) {
      data.number = data.issue.number
    }

    const pr = data.number

    // create unique logger which is easily traceable throughout the entire app
    // by having e.g. "nodejs/nodejs.org/#1337" part of every subsequent log statement
    const prTrace = `${org}/${repo}/#${pr}`
    data.logger = logger.child({ pr: prTrace, action: data.action }, true)

    data.logger.info('Emitting GitHub event')
    debug(data)

    return eventsEmitter.emit(data.action, {
      event: data,
      owner: org,
      repo,
      login: data.sender.login
    })
  }
}
