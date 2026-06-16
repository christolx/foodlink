package store

import "errors"

var ErrNotFound = errors.New("not found")

type ConflictError struct {
	Code string
}

func (e ConflictError) Error() string {
	return e.Code
}

func ErrConflict(code string) error {
	return ConflictError{Code: code}
}

type ForbiddenError struct {
	Code string
}

func (e ForbiddenError) Error() string {
	return e.Code
}

func ErrForbidden(code string) error {
	return ForbiddenError{Code: code}
}
