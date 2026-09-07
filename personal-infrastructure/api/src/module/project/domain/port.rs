use crate::module::common::exception::DomainError;

// #
// value

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Port(u16);

impl Port {
    // #
    // factory

    pub fn from_u16(value: u16) -> Result<Self, DomainError> {
        // value — 0 만 거부한다. 컨테이너 안에서는 80 도 흔하고, 호스트 포트는 예약대장이 20000대에서만 준다
        if value == 0 {
            return Err(DomainError::InvalidFormat { target: "Port" });
        }

        Ok(Self(value))
    }

    pub fn from_i32(value: i32) -> Result<Self, DomainError> {
        u16::try_from(value)
            .map_err(|_| DomainError::InvalidFormat { target: "Port" })
            .and_then(Self::from_u16)
    }

    pub fn to_u16(self) -> u16 {
        self.0
    }

    pub fn to_i32(self) -> i32 {
        i32::from(self.0)
    }
}
