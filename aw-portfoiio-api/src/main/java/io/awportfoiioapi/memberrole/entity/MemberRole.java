package io.awportfoiioapi.memberrole.entity;


import io.awportfoiioapi.mapperd.DateSuperClass;
import io.awportfoiioapi.member.entrity.Member;
import io.awportfoiioapi.role.entity.Role;
import jakarta.persistence.*;
import lombok.*;

import static jakarta.persistence.GenerationType.IDENTITY;

@Table(name = "MEMBER_ROLE")
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class MemberRole extends DateSuperClass {

    
      @Id
      @Column(name = "MEMBER_ROLE_ID")
      @GeneratedValue(strategy = IDENTITY)
      private Long id;
      
      @ManyToOne(fetch = FetchType.LAZY)
      @JoinColumn(name = "MEMBER_ID")
      private Member member;
      
      @ManyToOne(fetch = FetchType.LAZY)
      @JoinColumn(name = "ROLE_ID")
      private Role role;

      public void modifyRole(Role role) {
          this.role = role;
      }
}
