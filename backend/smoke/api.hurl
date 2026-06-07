# FoodLink backend smoke test.
# Run with: hurl --test --variable base_url=http://localhost:8080 backend/smoke/api.hurl

GET {{base_url}}/health
HTTP 200
[Asserts]
body == "ok"

POST {{base_url}}/api/v1/auth/demo-login
Content-Type: application/json
{
  "role": "donor"
}
HTTP 200
[Captures]
donor_token: jsonpath "$.accessToken"
[Asserts]
jsonpath "$.tokenType" == "Bearer"
jsonpath "$.user.id" == "user_donor"
jsonpath "$.user.role" == "donor"

POST {{base_url}}/api/v1/auth/demo-login
Content-Type: application/json
{
  "role": "receiver"
}
HTTP 200
[Captures]
receiver_token: jsonpath "$.accessToken"
[Asserts]
jsonpath "$.tokenType" == "Bearer"
jsonpath "$.user.id" == "user_receiver"
jsonpath "$.user.role" == "receiver"

POST {{base_url}}/api/v1/auth/demo-login
Content-Type: application/json
{
  "role": "volunteer"
}
HTTP 200
[Captures]
volunteer_token: jsonpath "$.accessToken"
[Asserts]
jsonpath "$.tokenType" == "Bearer"
jsonpath "$.user.id" == "user_volunteer"
jsonpath "$.user.role" == "volunteer"

GET {{base_url}}/api/v1/me
Authorization: Bearer {{donor_token}}
HTTP 200
[Asserts]
jsonpath "$.id" == "user_donor"
jsonpath "$.role" == "donor"

GET {{base_url}}/api/v1/me/profile
Authorization: Bearer {{receiver_token}}
HTTP 200
[Asserts]
jsonpath "$.userId" == "user_receiver"
jsonpath "$.role" == "receiver"

GET {{base_url}}/api/v1/receivers
Authorization: Bearer {{volunteer_token}}
HTTP 200
[Asserts]
jsonpath "$.items[0].userId" == "user_receiver"
jsonpath "$.items[0].role" == "receiver"
jsonpath "$.total" >= 1

GET {{base_url}}/api/v1/donations
Authorization: Bearer {{donor_token}}
HTTP 200
[Asserts]
jsonpath "$.items" exists
jsonpath "$.page" == 1
jsonpath "$.pageSize" == 20

GET {{base_url}}/api/v1/notifications
Authorization: Bearer {{donor_token}}
HTTP 200
[Asserts]
jsonpath "$.items" exists
jsonpath "$.page" == 1
jsonpath "$.pageSize" == 20

POST {{base_url}}/api/v1/donations
Authorization: Bearer {{donor_token}}
Content-Type: application/json
{
  "title": "Hurl smoke test rice and vegetables",
  "description": "API smoke test donation",
  "quantity": "10 portions",
  "pickupLocation": {
    "addressLine1": "Jl. Smoke Test 1",
    "city": "Jakarta",
    "region": "DKI Jakarta",
    "postalCode": "10220",
    "country": "ID"
  },
  "availableFrom": "2026-06-07T09:00:00Z",
  "availableUntil": "2026-06-07T18:00:00Z",
  "specialInstructions": "Smoke test record"
}
HTTP 201
[Captures]
donation_id: jsonpath "$.id"
[Asserts]
jsonpath "$.donorId" == "user_donor"
jsonpath "$.status" == "available"
jsonpath "$.title" == "Hurl smoke test rice and vegetables"

POST {{base_url}}/api/v1/delivery-proposals
Authorization: Bearer {{volunteer_token}}
Content-Type: application/json
{
  "donationId": "{{donation_id}}",
  "receiverId": "user_receiver"
}
HTTP 201
[Captures]
proposal_id: jsonpath "$.id"
[Asserts]
jsonpath "$.donationId" == "{{donation_id}}"
jsonpath "$.receiverId" == "user_receiver"
jsonpath "$.volunteerId" == "user_volunteer"
jsonpath "$.status" == "pending"

POST {{base_url}}/api/v1/delivery-proposals/{{proposal_id}}/accept
Authorization: Bearer {{donor_token}}
HTTP 200
[Asserts]
jsonpath "$.proposal.id" == "{{proposal_id}}"
jsonpath "$.proposal.status" == "pending"
jsonpath "$.proposal.donorAcceptedAt" exists
jsonpath "$.pickup" not exists

POST {{base_url}}/api/v1/delivery-proposals/{{proposal_id}}/accept
Authorization: Bearer {{receiver_token}}
HTTP 200
[Captures]
pickup_id: jsonpath "$.pickup.id"
[Asserts]
jsonpath "$.proposal.id" == "{{proposal_id}}"
jsonpath "$.proposal.status" == "accepted"
jsonpath "$.proposal.receiverAcceptedAt" exists
jsonpath "$.pickup.status" == "assigned"

POST {{base_url}}/api/v1/pickups/{{pickup_id}}/pickup
Authorization: Bearer {{volunteer_token}}
Content-Type: application/json
{}
HTTP 200
[Asserts]
jsonpath "$.id" == "{{pickup_id}}"
jsonpath "$.status" == "picked_up"
jsonpath "$.pickedUpAt" exists

POST {{base_url}}/api/v1/pickups/{{pickup_id}}/deliver
Authorization: Bearer {{volunteer_token}}
Content-Type: application/json
{}
HTTP 200
[Asserts]
jsonpath "$.id" == "{{pickup_id}}"
jsonpath "$.status" == "delivered"
jsonpath "$.deliveredAt" exists

GET {{base_url}}/api/v1/me
HTTP 401
[Asserts]
jsonpath "$.code" == "unauthorized"

GET {{base_url}}/api/v1/receivers
Authorization: Bearer {{donor_token}}
HTTP 403
[Asserts]
jsonpath "$.code" == "forbidden"

POST {{base_url}}/api/v1/auth/demo-login
Content-Type: application/json
{}
HTTP 400
[Asserts]
jsonpath "$.code" == "bad_request"

POST {{base_url}}/api/v1/pickups/{{pickup_id}}/deliver
Authorization: Bearer {{volunteer_token}}
Content-Type: application/json
{}
HTTP 409
[Asserts]
jsonpath "$.code" == "conflict"
jsonpath "$.message" == "invalid_pickup_state"
