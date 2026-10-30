package io.awportfoiioapi.userlist.controller;


import io.awportfoiioapi.advice.exception.CategoryAndPortfolioException;
import io.awportfoiioapi.apiresponse.ApiResponse;
import io.awportfoiioapi.member.page.PageResponse;
import io.awportfoiioapi.userlist.dto.request.UserListPostRequest;
import io.awportfoiioapi.userlist.dto.request.UserListRolePutRequest;
import io.awportfoiioapi.userlist.dto.response.UserListGetResponse;
import io.awportfoiioapi.userlist.service.UserListService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RequestMapping("/api")
@RequiredArgsConstructor
@RestController
public class UserListController {

    private final UserListService userListService;
    
    
    @GetMapping("/user-list")
    public PageResponse<UserListGetResponse> getUserList(@PageableDefault(size = 10) Pageable pageable) {
        Page<UserListGetResponse> userList = userListService.getUserList(pageable);
        return PageResponse.from(userList);
    }
    
    @PostMapping("/user-list")
    public ApiResponse createUserList(@Validated @RequestBody UserListPostRequest request) {
        return userListService.createUserList(request);
    }

    // URL 권한 테이블에 없는 경로는 누구나 호출 가능하므로, 최고 관리자 여부를 여기서 직접 확인한다
    @PutMapping("/user-list/role")
    public ApiResponse modifyUserRole(@Validated @RequestBody UserListRolePutRequest request, Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthentication)
                || jwtAuthentication.getAuthorities().stream().noneMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()))) {
            throw new CategoryAndPortfolioException("최고 관리자만 권한을 변경할 수 있습니다.", null);
        }

        Object idClaim = jwtAuthentication.getToken().getClaims().get("id");
        Long loginMemberId = idClaim instanceof Number number ? number.longValue() : null;

        return userListService.modifyUserRole(request, loginMemberId);
    }
}
