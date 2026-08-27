# Risk Register

Risk score is calculated as:

```text
Score = Likelihood × Impact
```

| ID | Risk                                                                       | Likelihood (1–5) | Impact (1–5) | Score | Trigger                                                                                                                       | Mitigation                                                                                                                                                                          | Contingency                                                                                                                                            | Owner                        |
| -- | -------------------------------------------------------------------------- | ---------------: | -----------: | ----: | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| R1 | Kafka or PostgreSQL is unavailable during the demonstration                |                3 |            5 |    15 | A readiness check fails, a PVC is not bound, Kafka cannot be reached, or a required pod is not running                        | Run Kubernetes health, rollout, PVC, database, and Kafka checks before the demonstration; retain sanitized evidence from successful smoke tests                                     | Restart only the failed workload, inspect its events and logs, and rerun the smoke test after recovery                                                 | Christopher — Infrastructure |
| R2 | Authentication, JWT, or CORS configuration blocks the application workflow |                3 |            4 |    12 | Valid credentials unexpectedly return 401 or 403, or login works directly against the backend but fails through the frontend  | Automate authentication tests; verify AGENT and ADMIN roles; test frontend-to-backend requests; configure approved CORS origins; provide the JWT secret through a Kubernetes Secret | Restore the last working backend image and configuration, verify login with `curl`, and redeploy the corrected release                                 | Backend/Security Lead        |
| R3 | An interaction persists but its Kafka event is not published               |                3 |            4 |    12 | The API returns 201 and the PostgreSQL row exists, but no matching event appears in `crm.customer.interactions.v1`            | Add publisher and integration tests; preserve the interaction, customer, and correlation IDs; verify Kafka connectivity and document the publish-after-commit strategy              | Preserve the database record, inspect producer logs, repair the publisher, and replay the event using the documented recovery procedure                | Backend Lead + Christopher   |
| R4 | The frontend and backend use incompatible API contracts                    |                3 |            4 |    12 | The browser receives 400, 403, or 404 responses even though the backend health endpoint is UP                                 | Maintain a documented API contract; test request paths and payloads; run an end-to-end login, search, and interaction smoke test before deployment                                  | Roll back the incompatible frontend or backend image and deploy a previously tested pair of image versions                                             | Frontend Lead + Backend Lead |
| R5 | Credentials, JWTs, kubeconfig files, or customer information are exposed   |                2 |            5 |    10 | A secret scan finds sensitive data, credentials appear in logs or screenshots, or a kubeconfig is committed                   | Store credentials in Kubernetes Secrets or protected CI variables; use only synthetic customer data; redact tokens and run secret scans before merging                              | Rotate the exposed credential, JWT secret, or kubeconfig immediately; invalidate affected tokens and remove compromised evidence from shared locations | Entire Team                  |
| R6 | Kubernetes deploys the wrong or unavailable container image                |                3 |            5 |    15 | A pod enters `ImagePullBackOff`, a rollout times out, health probes fail, or the deployment uses an unexpected `latest` image | Publish backend and frontend images through GitHub Actions; verify GHCR access; tag images with the commit SHA; pin releases to a SHA or digest; retain the previous working image  | Run `kubectl rollout undo` or reapply the previous image digest, verify pod readiness, and record the rollback result                                  | Christopher — DevOps         |

## Review Process

The team reviews this register:

* Before merging a release into `main`
* Before deploying to the SWE2 Kubernetes cluster
* Before the final capstone demonstration
* After any failed CI job, deployment, or smoke test

Risks with a score of 15 or greater require mitigation evidence before the final demonstration.
