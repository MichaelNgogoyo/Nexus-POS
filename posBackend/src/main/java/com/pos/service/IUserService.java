package com.pos.service;

import com.pos.dao.user.CreateUserRequest;
import com.pos.model.User;

public interface IUserService {
    public User createUser(CreateUserRequest createUserRequest);
}
