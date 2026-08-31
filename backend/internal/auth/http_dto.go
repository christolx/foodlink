package auth

import (
	"foodlink-be/internal/api"
	"foodlink-be/internal/models"

	openapi_types "github.com/oapi-codegen/runtime/types"
)

func userDTO(user models.User) api.User {
	return api.User{Id: user.ID, Name: user.Name, Email: openapi_types.Email(user.Email), Role: api.UserRole(user.Role), Phone: user.Phone, CreatedAt: user.CreatedAt}
}
