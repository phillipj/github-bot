'use strict'

const githubClient = require('./github-client')

exports.createPrComment = function createPrComment ({ owner, repo, number, logger }, body) {
  return githubClient.issues.createComment({
    owner,
    repo,
    number,
    body
  }).catch((err) => {
    logger.error(err, 'Error while creating comment on GitHub')
  })
}
