package profiles

import (
	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
)

func profileDTO(profile models.Profile) api.Profile {
	return api.Profile{UserId: profile.UserID, DisplayName: profile.DisplayName, Role: api.UserRole(profile.Role), ContactMethod: api.ContactMethod(profile.ContactMethod), ContactValue: profile.ContactValue, Location: locationDTO(profile.Location), EntityType: entityTypeDTO(profile.EntityType), OperationalHours: profile.OperationalHours, Notes: profile.Notes, CreatedAt: profile.CreatedAt, UpdatedAt: profile.UpdatedAt}
}
func locationDTO(location models.LocationFields) api.Location {
	return api.Location{AddressLine1: location.AddressLine1, AddressLine2: location.AddressLine2, City: location.City, Region: location.Region, PostalCode: location.PostalCode, Country: location.Country, Latitude: location.Latitude, Longitude: location.Longitude}
}
func locationModel(location api.Location) models.LocationFields {
	return models.LocationFields{AddressLine1: location.AddressLine1, AddressLine2: location.AddressLine2, City: location.City, Region: location.Region, PostalCode: location.PostalCode, Country: location.Country, Latitude: location.Latitude, Longitude: location.Longitude}
}
func entityTypeDTO(value *string) *api.EntityType {
	if value == nil {
		return nil
	}
	entityType := api.EntityType(*value)
	return &entityType
}
func entityTypeString(value *api.EntityType) *string {
	if value == nil {
		return nil
	}
	stringValue := string(*value)
	return &stringValue
}
