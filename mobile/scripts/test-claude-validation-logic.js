const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const ts = require('typescript')

function transpileToTemp(relativePath, label) {
  const sourcePath = path.join(__dirname, '..', relativePath)
  const source = fs.readFileSync(sourcePath, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
  const tempPath = path.join(os.tmpdir(), `xpawsure-${label}-${process.pid}.cjs`)
  fs.writeFileSync(tempPath, output)
  return tempPath
}

const validationTemp = transpileToTemp(
  path.join('ai', 'services', 'claudeValidation.ts'),
  'claude-validation',
)
const logicTemp = transpileToTemp(path.join('ai', 'services', 'screening.logic.ts'), 'claude-logic')

async function run() {
  try {
    const {
      CLAUDE_MAX_ATTEMPTS_PER_IMAGE,
      CLAUDE_SESSION_CALL_LIMIT,
      CLAUDE_VALIDATION_MAX_IMAGES,
      createValidationSession,
      isRetryableValidationStatus,
      mapClaudeResponse,
      mapHttpFailure,
      notValidatedDecision,
      resolveEligibility,
      selectValidationTargets,
      validateTargetImages,
      validationCacheKey,
    } = require(validationTemp)
    const { buildImageReports, countRejectedReports, MIN_VALID_IMAGES } = require(logicTemp)

    const thresholds = { minSimilarity: 0.10, skinSimilarity: 0.30 }

    const okOutcome = (token = 'tok-1') => ({
      status: 'OK',
      result: {
        image_suitability: 'SUITABLE',
        screening_eligibility: 'ELIGIBLE',
        screening_message: 'Approved for screening.',
      },
      token,
      detail: 'Image review completed.',
    })

    const rejectedOutcome = (suitability) => ({
      status: 'OK',
      result: {
        image_suitability: suitability,
        screening_eligibility: 'NOT_ELIGIBLE',
        screening_message: `${suitability} message.`,
      },
      token: 'tok-rejected',
      detail: 'Image review completed.',
    })

    const apiStatusOutcome = (status) => ({
      status,
      result: null,
      detail: `detail-${status}`,
    })

    const makeIO = (plan) => {
      const calls = []
      return {
        calls,
        io: {
          callApi: async (uri) => {
            calls.push(uri)
            return plan(uri, calls.filter((entry) => entry === uri).length)
          },
          shaFor: async (uri) => `sha-${uri}`,
        },
      }
    }

    // --- constants and target selection -------------------------------------

    assert.strictEqual(CLAUDE_VALIDATION_MAX_IMAGES, 3)
    assert.strictEqual(CLAUDE_SESSION_CALL_LIMIT, 3)
    assert.strictEqual(CLAUDE_MAX_ATTEMPTS_PER_IMAGE, 2)
    assert.strictEqual(MIN_VALID_IMAGES, 3)

    // Defensive cap: even if more flags are ever passed, only the first three
    // are targets. The three-photo UI never supplies more than three.
    assert.deepStrictEqual(selectValidationTargets([true, true, true, true, true]), [0, 1, 2])
    assert.deepStrictEqual(selectValidationTargets([false, true, true, true, true]), [1, 2, 3])
    assert.deepStrictEqual(selectValidationTargets([false, false, true, true, true]), [2, 3, 4])
    assert.deepStrictEqual(selectValidationTargets([true, false, false, false, false]), [0])
    // Three-photo session: every quality-passing slot is a target.
    assert.deepStrictEqual(selectValidationTargets([true, true, true]), [0, 1, 2])
    assert.deepStrictEqual(selectValidationTargets([true, false, true]), [0, 2])
    assert.deepStrictEqual(selectValidationTargets([false, false, true]), [2])
    assert.deepStrictEqual(selectValidationTargets([false, false, false]), [])

    assert.strictEqual(validationCacheKey('session-a', 'abc'), 'session-a:abc')

    const freshSession = createValidationSession()
    assert.strictEqual(freshSession.callsUsed, 0)
    assert.deepStrictEqual(freshSession.cache, {})

    // --- retry policy --------------------------------------------------------

    assert.strictEqual(isRetryableValidationStatus('TIMEOUT'), true)
    assert.strictEqual(isRetryableValidationStatus('PROVIDER_ERROR'), true)
    assert.strictEqual(isRetryableValidationStatus('VALIDATION_ERROR'), true)
    assert.strictEqual(isRetryableValidationStatus('OK'), false)
    assert.strictEqual(isRetryableValidationStatus('RATE_LIMITED'), false)
    assert.strictEqual(isRetryableValidationStatus('QUOTA_EXHAUSTED'), false)
    assert.strictEqual(isRetryableValidationStatus('NOT_CONFIGURED'), false)
    assert.strictEqual(isRetryableValidationStatus('MALFORMED_RESPONSE'), false)
    assert.strictEqual(isRetryableValidationStatus('NOT_VALIDATED'), false)

    // --- HTTP failure mapping ------------------------------------------------

    assert.strictEqual(mapHttpFailure(undefined), 'PROVIDER_ERROR')
    assert.strictEqual(mapHttpFailure(undefined, true), 'TIMEOUT')
    assert.strictEqual(mapHttpFailure(401), 'NOT_CONFIGURED')
    assert.strictEqual(mapHttpFailure(403), 'NOT_CONFIGURED')
    assert.strictEqual(mapHttpFailure(408), 'TIMEOUT')
    assert.strictEqual(mapHttpFailure(504), 'TIMEOUT')
    assert.strictEqual(mapHttpFailure(429), 'RATE_LIMITED')
    assert.strictEqual(mapHttpFailure(529), 'RATE_LIMITED')
    assert.strictEqual(mapHttpFailure(500), 'PROVIDER_ERROR')
    assert.strictEqual(mapHttpFailure(503), 'PROVIDER_ERROR')
    assert.strictEqual(mapHttpFailure(400), 'MALFORMED_RESPONSE')
    assert.strictEqual(mapHttpFailure(422), 'MALFORMED_RESPONSE')

    // --- response mapping ----------------------------------------------------

    const nullMapped = mapClaudeResponse(null)
    assert.strictEqual(nullMapped.status, 'VALIDATION_ERROR')
    assert.strictEqual(nullMapped.approved, false)

    const transportMapped = mapClaudeResponse({ failureStatus: 'RATE_LIMITED' })
    assert.strictEqual(transportMapped.status, 'RATE_LIMITED')
    assert.strictEqual(transportMapped.approved, false)

    const approvedDecision = mapClaudeResponse(okOutcome('tok-approved'))
    assert.strictEqual(approvedDecision.status, 'OK')
    assert.strictEqual(approvedDecision.approved, true)
    assert.strictEqual(approvedDecision.suitability, 'SUITABLE')
    assert.strictEqual(approvedDecision.eligibility, 'ELIGIBLE')
    assert.strictEqual(approvedDecision.token, 'tok-approved')
    assert.strictEqual(approvedDecision.message, 'Approved for screening.')

    const rejectedDecision = mapClaudeResponse(rejectedOutcome('NOT_DOG_SKIN'))
    assert.strictEqual(rejectedDecision.status, 'OK')
    assert.strictEqual(rejectedDecision.approved, false)
    assert.strictEqual(rejectedDecision.suitability, 'NOT_DOG_SKIN')
    assert.strictEqual(rejectedDecision.message, 'NOT_DOG_SKIN message.')

    const providerFailure = mapClaudeResponse(apiStatusOutcome('TIMEOUT'))
    assert.strictEqual(providerFailure.status, 'TIMEOUT')
    assert.strictEqual(providerFailure.approved, false)
    assert.strictEqual(providerFailure.message, 'detail-TIMEOUT')

    const unknownStatus = mapClaudeResponse({ status: 'NOT_A_STATUS' })
    assert.strictEqual(unknownStatus.status, 'VALIDATION_ERROR')
    assert.strictEqual(unknownStatus.approved, false)

    const missingResult = mapClaudeResponse({ status: 'OK', token: 'tok-x' })
    assert.strictEqual(missingResult.status, 'VALIDATION_ERROR')
    assert.strictEqual(missingResult.approved, false)

    const noTokenResponse = okOutcome('tok-x')
    delete noTokenResponse.token
    const noTokenDecision = mapClaudeResponse(noTokenResponse)
    assert.strictEqual(noTokenDecision.approved, true)
    assert.strictEqual(noTokenDecision.token, null)

    // --- session budget: first attempts, then retries ------------------------

    {
      const state = createValidationSession()
      const { io, calls } = makeIO(() => okOutcome())
      const targets = [
        { index: 0, uri: 'u0' },
        { index: 1, uri: 'u1' },
        { index: 2, uri: 'u2' },
      ]

      const decisions = await validateTargetImages({ sessionId: 's-fresh', state, io, targets })

      assert.strictEqual(calls.length, CLAUDE_SESSION_CALL_LIMIT)
      assert.strictEqual(state.callsUsed, CLAUDE_SESSION_CALL_LIMIT)
      assert.strictEqual(decisions[0].approved, true)
      assert.strictEqual(decisions[1].approved, true)
      assert.strictEqual(decisions[2].approved, true)
      assert.strictEqual(Object.keys(state.cache).length, 3)
    }

    {
      // All three first attempts fail transiently: budget is spent on phase 1,
      // so no retries may happen.
      const state = createValidationSession()
      const { io, calls } = makeIO(() => apiStatusOutcome('TIMEOUT'))
      const targets = [
        { index: 0, uri: 'u0' },
        { index: 1, uri: 'u1' },
        { index: 2, uri: 'u2' },
      ]

      const decisions = await validateTargetImages({ sessionId: 's-retry', state, io, targets })

      assert.strictEqual(calls.length, CLAUDE_SESSION_CALL_LIMIT)
      assert.strictEqual(state.callsUsed, CLAUDE_SESSION_CALL_LIMIT)
      assert.strictEqual(decisions[0].status, 'TIMEOUT')
      assert.strictEqual(decisions[1].status, 'TIMEOUT')
      assert.strictEqual(decisions[2].status, 'TIMEOUT')
      assert.strictEqual(decisions[0].approved, false)
      assert.deepStrictEqual(Object.keys(state.cache), [], 'transient failures are not cached')
    }

    {
      // One cached target frees budget for a retry of a transient failure.
      const state = createValidationSession()
      state.cache[validationCacheKey('s-mixed', 'sha-u0')] = mapClaudeResponse(okOutcome('tok-cached'))
      const { io, calls } = makeIO((uri, attempt) => {
        if (uri === 'u1' && attempt === 1) return apiStatusOutcome('TIMEOUT')
        if (uri === 'u1' && attempt === 2) return okOutcome('tok-retry')
        return okOutcome(`tok-${uri}`)
      })
      const targets = [
        { index: 0, uri: 'u0' },
        { index: 1, uri: 'u1' },
        { index: 2, uri: 'u2' },
      ]

      const decisions = await validateTargetImages({ sessionId: 's-mixed', state, io, targets })

      assert.strictEqual(calls.length, CLAUDE_SESSION_CALL_LIMIT)
      assert.deepStrictEqual(calls, ['u1', 'u2', 'u1'])
      assert.strictEqual(decisions[0].approved, true)
      assert.strictEqual(decisions[0].token, 'tok-cached')
      assert.strictEqual(decisions[1].approved, true)
      assert.strictEqual(decisions[1].token, 'tok-retry')
      assert.strictEqual(decisions[2].approved, true)
      assert.strictEqual(state.callsUsed, CLAUDE_SESSION_CALL_LIMIT)
      assert.strictEqual(Object.keys(state.cache).length, 3)
    }

    {
      // Exhausted budget: no API calls, photos are NOT_VALIDATED.
      const state = createValidationSession()
      state.callsUsed = CLAUDE_SESSION_CALL_LIMIT
      const { io, calls } = makeIO(() => okOutcome())
      const targets = [
        { index: 0, uri: 'u0' },
        { index: 1, uri: 'u1' },
        { index: 2, uri: 'u2' },
      ]

      const decisions = await validateTargetImages({ sessionId: 's-empty', state, io, targets })

      assert.strictEqual(calls.length, 0)
      assert.strictEqual(state.callsUsed, CLAUDE_SESSION_CALL_LIMIT)
      assert.strictEqual(decisions[0].status, 'NOT_VALIDATED')
      assert.strictEqual(decisions[1].status, 'NOT_VALIDATED')
      assert.strictEqual(decisions[2].status, 'NOT_VALIDATED')
      assert.ok(decisions[0].message.includes('AI review limit of 3'))
      assert.deepStrictEqual(Object.keys(state.cache), [])
    }

    {
      // Settled failures are cached; fresh sessions spend budget on new calls.
      const state = createValidationSession()
      const notConfiguredIO = makeIO(() => apiStatusOutcome('NOT_CONFIGURED'))
      const notConfiguredTargets = [
        { index: 0, uri: 'u0' },
        { index: 1, uri: 'u1' },
        { index: 2, uri: 'u2' },
      ]
      await validateTargetImages({
        sessionId: 's-settled',
        state,
        io: notConfiguredIO.io,
        targets: notConfiguredTargets,
      })
      assert.strictEqual(notConfiguredIO.calls.length, 3)
      assert.strictEqual(Object.keys(state.cache).length, 3)

      const secondSession = createValidationSession()
      secondSession.callsUsed = 1
      const secondRun = makeIO(() => okOutcome())
      const secondTargets = [
        { index: 0, uri: 'u0' },
        { index: 1, uri: 'u1' },
      ]
      const secondDecisions = await validateTargetImages({
        sessionId: 's-settled-next',
        state: secondSession,
        io: secondRun.io,
        targets: secondTargets,
      })
      assert.strictEqual(secondSession.callsUsed, CLAUDE_SESSION_CALL_LIMIT)
      assert.strictEqual(secondRun.calls.length, 2)
      assert.strictEqual(secondDecisions[0].approved, true)
      assert.strictEqual(Object.keys(secondSession.cache).length, 2)
    }

    {
      // Second run in the same session: cache hits cost nothing, a replaced
      // photo hits the exhausted budget and is NOT_VALIDATED.
      const state = createValidationSession()
      const { io, calls } = makeIO((uri, attempt) => {
        if (uri === 'u2' && attempt === 1) return apiStatusOutcome('TIMEOUT')
        return okOutcome(`tok-${uri}`)
      })
      const targets = [
        { index: 0, uri: 'u0' },
        { index: 1, uri: 'u1' },
        { index: 2, uri: 'u2' },
      ]
      const firstRunDecisions = await validateTargetImages({
        sessionId: 's-rerun',
        state,
        io,
        targets,
      })
      assert.strictEqual(calls.length, 3)
      assert.strictEqual(firstRunDecisions[2].status, 'TIMEOUT')
      assert.strictEqual(state.callsUsed, 3)

      const secondRun = makeIO(() => okOutcome())
      const replacedTargets = [
        { index: 0, uri: 'u0' },
        { index: 1, uri: 'u1' },
        { index: 2, uri: 'u2-replaced' },
      ]
      const secondRunDecisions = await validateTargetImages({
        sessionId: 's-rerun',
        state,
        io: secondRun.io,
        targets: replacedTargets,
      })
      assert.strictEqual(secondRun.calls.length, 0)
      assert.strictEqual(state.callsUsed, 3)
      assert.strictEqual(secondRunDecisions[0].approved, true, 'cache hit reuses the settled approval')
      assert.strictEqual(secondRunDecisions[1].approved, true)
      assert.strictEqual(secondRunDecisions[2].status, 'NOT_VALIDATED')
    }

    {
      // Hash failure fails that photo without spending budget.
      const state = createValidationSession()
      const { io, calls } = makeIO(() => okOutcome())
      io.shaFor = async (uri) => {
        if (uri === 'u1') throw new Error('unreadable')
        return `sha-${uri}`
      }
      const targets = [
        { index: 0, uri: 'u0' },
        { index: 1, uri: 'u1' },
        { index: 2, uri: 'u2' },
      ]

      const decisions = await validateTargetImages({ sessionId: 's-hash', state, io, targets })

      assert.deepStrictEqual(calls, ['u0', 'u2'])
      assert.strictEqual(state.callsUsed, 2)
      assert.strictEqual(decisions[1].status, 'VALIDATION_ERROR')
      assert.strictEqual(decisions[1].approved, false)
      assert.strictEqual(Object.keys(state.cache).length, 2)
    }

    {
      // Defensive cap: only the first three targets are ever reviewed, even if
      // more are passed. The three-photo UI never passes more than three.
      const state = createValidationSession()
      const { io, calls } = makeIO(() => okOutcome())
      const targets = [
        { index: 0, uri: 'u0' },
        { index: 1, uri: 'u1' },
        { index: 2, uri: 'u2' },
        { index: 3, uri: 'u3' },
        { index: 4, uri: 'u4' },
      ]

      const decisions = await validateTargetImages({ sessionId: 's-cap', state, io, targets })

      assert.deepStrictEqual(calls, ['u0', 'u1', 'u2'])
      assert.strictEqual(decisions[3], undefined)
      assert.strictEqual(decisions[4], undefined)
      assert.strictEqual(state.callsUsed, 3)
    }

    // --- eligibility ---------------------------------------------------------

    {
      const allApproved = {
        0: mapClaudeResponse(okOutcome()),
        1: mapClaudeResponse(okOutcome()),
        2: mapClaudeResponse(okOutcome()),
      }
      const result = resolveEligibility(allApproved, [0, 1, 2], MIN_VALID_IMAGES)
      assert.strictEqual(result.blocked, false)
      assert.deepStrictEqual(result.approved, [0, 1, 2])
      assert.strictEqual(result.message, null)
    }

    {
      // One photo failed the quality check upstream: only [0, 1] reach Claude,
      // so all three can never be approved. Quality message, not a review one.
      const oneQualityFailure = {
        0: mapClaudeResponse(okOutcome()),
        1: mapClaudeResponse(okOutcome()),
      }
      const result = resolveEligibility(oneQualityFailure, [0, 1], MIN_VALID_IMAGES)
      assert.strictEqual(result.blocked, true)
      assert.deepStrictEqual(result.approved, [0, 1])
      assert.strictEqual(
        result.message,
        'All 3 photos must pass the image quality checks before screening can continue. Please retake the photo(s) that are blurry, too dark, or unclear.',
      )
      assert.ok(!result.message.includes('AI safety review'))
    }

    {
      // Two photos failed the quality check upstream: only [0] reaches Claude.
      const twoQualityFailures = {
        0: mapClaudeResponse(okOutcome()),
      }
      const result = resolveEligibility(twoQualityFailures, [0], MIN_VALID_IMAGES)
      assert.strictEqual(result.blocked, true)
      assert.deepStrictEqual(result.approved, [0])
      assert.strictEqual(
        result.message,
        'All 3 photos must pass the image quality checks before screening can continue. Please retake the photo(s) that are blurry, too dark, or unclear.',
      )
      assert.ok(!result.message.includes('AI safety review'))
    }

    {
      // All three reached Claude; one rejected by the review.
      const twoApproved = {
        0: mapClaudeResponse(okOutcome()),
        1: mapClaudeResponse(okOutcome()),
        2: mapClaudeResponse(rejectedOutcome('NOT_DOG_SKIN')),
      }
      const result = resolveEligibility(twoApproved, [0, 1, 2], MIN_VALID_IMAGES)
      assert.strictEqual(result.blocked, true)
      assert.deepStrictEqual(result.approved, [0, 1])
      assert.strictEqual(
        result.message,
        'All 3 photos must be approved by the AI safety review before screening can continue. Please replace the rejected photo(s), then start a new screening.',
      )
      assert.ok(!result.message.includes('image quality checks'))
    }

    {
      const transportFailed = {
        0: mapClaudeResponse(okOutcome()),
        1: mapClaudeResponse(okOutcome()),
        2: mapClaudeResponse(apiStatusOutcome('TIMEOUT')),
      }
      const result = resolveEligibility(transportFailed, [0, 1, 2], MIN_VALID_IMAGES)
      assert.strictEqual(result.blocked, true)
      assert.ok(result.message.includes('detail-TIMEOUT'))
      assert.ok(result.message.includes('Start a new screening'))
    }

    {
      const budgetExhausted = {
        0: mapClaudeResponse(okOutcome()),
        1: mapClaudeResponse(okOutcome()),
        2: notValidatedDecision(
          'The AI review limit of 3 photos for this screening session has been reached.',
        ),
      }
      const result = resolveEligibility(budgetExhausted, [0, 1, 2], MIN_VALID_IMAGES)
      assert.strictEqual(result.blocked, true)
      assert.ok(result.message.includes('AI review limit of 3'))
      assert.ok(result.message.includes('Start a new screening'))
    }

    {
      // Targets [1,2,3] with slot 3 rejected: approval set stops at [1, 2].
      const partial = {
        0: mapClaudeResponse(okOutcome()),
        1: mapClaudeResponse(okOutcome()),
        2: mapClaudeResponse(okOutcome()),
        3: mapClaudeResponse(rejectedOutcome('NOT_DOG_SKIN')),
      }
      const result = resolveEligibility(partial, [1, 2, 3], MIN_VALID_IMAGES)
      assert.strictEqual(result.blocked, true)
      assert.deepStrictEqual(result.approved, [1, 2])
      assert.strictEqual(
        result.message,
        'All 3 photos must be approved by the AI safety review before screening can continue. Please replace the rejected photo(s), then start a new screening.',
      )
    }

    // --- report mapping ------------------------------------------------------

    {
      // Three-photo session: ok / quality-failed / Claude-rejected skin.
      const ok = mapClaudeResponse(okOutcome())
      const rejectedSkin = mapClaudeResponse(rejectedOutcome('NOT_DOG_SKIN'))

      const reports = buildImageReports(
        ['p0', 'p1', 'p2'],
        [true, false, true],
        [0.696, null, null],
        thresholds,
        [ok, null, rejectedSkin],
      )

      assert.deepStrictEqual(
        reports.map((report) => report.status),
        ['ok', 'quality_failed', 'not_skin'],
      )
      assert.deepStrictEqual(
        reports.map((report) => report.similarity),
        [0.696, null, null],
      )
      assert.strictEqual(reports[0].claudeStatus, 'OK')
      assert.strictEqual(reports[1].claudeStatus, undefined)
      assert.strictEqual(reports[2].claudeStatus, 'OK')

      assert.deepStrictEqual(countRejectedReports(reports), {
        quality: 1,
        notSkin: 1,
        lowSimilarity: 0,
        notValidated: 0,
        validationError: 0,
      })

      // Three-photo session: review failure / not validated / approved+similar.
      const rateLimited = mapClaudeResponse({ failureStatus: 'RATE_LIMITED' })
      const notValidated = notValidatedDecision()

      const reports2 = buildImageReports(
        ['p3', 'p4', 'p5'],
        [true, true, true],
        [null, null, 0.696],
        thresholds,
        [rateLimited, notValidated, ok],
      )

      assert.deepStrictEqual(
        reports2.map((report) => report.status),
        ['validation_error', 'not_validated', 'ok'],
      )
      assert.deepStrictEqual(
        reports2.map((report) => report.similarity),
        [null, null, 0.696],
      )
      assert.strictEqual(reports2[0].claudeStatus, 'RATE_LIMITED')
      assert.strictEqual(reports2[1].claudeStatus, 'NOT_VALIDATED')
      assert.ok(reports2[1].claudeMessage)
      assert.strictEqual(reports2[2].claudeStatus, 'OK')

      assert.deepStrictEqual(countRejectedReports(reports2), {
        quality: 0,
        notSkin: 0,
        lowSimilarity: 0,
        notValidated: 1,
        validationError: 1,
      })
    }

    {
      // Quality failure wins over Claude, and no Claude fields are attached.
      const reports = buildImageReports(
        ['dark'],
        [false],
        [null],
        thresholds,
        [mapClaudeResponse(okOutcome())],
      )
      assert.strictEqual(reports[0].status, 'quality_failed')
      assert.strictEqual(reports[0].claudeStatus, undefined)
      assert.strictEqual(reports[0].similarity, null)
    }

    {
      // Approved but never inferred: still counts as used, with no similarity.
      const ok = mapClaudeResponse(okOutcome())
      const approvedNoInference = buildImageReports(['photo'], [true], [null], thresholds, [ok])
      assert.strictEqual(approvedNoInference[0].status, 'ok')
      assert.strictEqual(approvedNoInference[0].similarity, null)

      // Legacy path without Claude decisions keeps the old behavior.
      const legacy = buildImageReports(['photo'], [true], [null], thresholds)
      assert.strictEqual(legacy[0].status, 'low_similarity')
      assert.strictEqual(legacy[0].similarity, null)

      const legacyWithSimilarity = buildImageReports(['photo'], [true], [0.4], thresholds)
      assert.strictEqual(legacyWithSimilarity[0].status, 'ok')
      assert.strictEqual(legacyWithSimilarity[0].similarity, 0.4)
    }

    {
      // Blocked-path reports in a three-photo session: approved photos stay
      // 'ok', quality failures explain why (flag-based and Claude-based).
      const ok = mapClaudeResponse(okOutcome())
      const reports = buildImageReports(
        ['p0', 'p1', 'p2'],
        [true, false, true],
        null,
        thresholds,
        [ok, null, mapClaudeResponse(rejectedOutcome('POOR_QUALITY'))],
      )
      assert.deepStrictEqual(
        reports.map((report) => report.status),
        ['ok', 'quality_failed', 'quality_failed'],
      )
      const counts = countRejectedReports(reports)
      assert.strictEqual(counts.quality, 2)
      assert.strictEqual(counts.notValidated, 0)
      assert.strictEqual(counts.notSkin, 0)
    }

    console.log('claude validation logic tests passed')
  } finally {
    fs.unlinkSync(validationTemp)
    fs.unlinkSync(logicTemp)
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
