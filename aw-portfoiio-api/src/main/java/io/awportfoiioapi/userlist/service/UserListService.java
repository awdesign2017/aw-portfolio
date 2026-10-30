package io.awportfoiioapi.userlist.service;

import io.awportfoiioapi.apiresponse.ApiResponse;
import io.awportfoiioapi.userlist.dto.request.UserListPostRequest;
import io.awportfoiioapi.userlist.dto.request.UserListRolePutRequest;
import io.awportfoiioapi.userlist.dto.response.UserListGetResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserListService {

    Page<UserListGetResponse> getUserList(Pageable pageable);
    ApiResponse createUserList(UserListPostRequest request);
    ApiResponse modifyUserRole(UserListRolePutRequest request, Long loginMemberId);
}
