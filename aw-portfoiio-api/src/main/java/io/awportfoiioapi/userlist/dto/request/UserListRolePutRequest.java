package io.awportfoiioapi.userlist.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class UserListRolePutRequest {

    @NotNull(message = "회원 ID는 필수입니다.")
    private Long memberId;
    @NotBlank(message = "권한은 필수 입력입니다.")
    private String role;

}
