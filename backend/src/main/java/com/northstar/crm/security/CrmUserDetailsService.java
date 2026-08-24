package com.northstar.crm.security;

import com.northstar.crm.repo.UserRepository;
import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

// Tells Spring Security which accounts exist, by looking them up in the
// real app_user table via UserRepository.
@Service
public class CrmUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CrmUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    //By doing userRepositroy.findById(username) the following function will be check the V3_user.sql db through userRepository
    //If it exists then the user entitiy will gets username, passowrd and role. If not then it will throw the exeception
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        com.northstar.crm.domain.User user = userRepository.findById(username)
                .orElseThrow(() -> new UsernameNotFoundException("Unknown user: " + username));

        //So by doing this, it is changing the user entitiy information format into new entitiy that Spring Security can understand
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole())))
                .build();
    }
}