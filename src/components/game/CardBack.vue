<template>
  <div class="card-back">
    <div class="card-back-pattern">
      <span class="card-back-symbol">✦</span>
    </div>
  </div>
</template>

<style scoped>
.card-back {
  width: 110px;
  height: 165px;
  border-radius: 12px;
  border: 2px solid #a0aec0;
  background: linear-gradient(135deg, #cbd5e1 0%, #f1f5f9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 4px 6px -1px rgba(160, 174, 192, 0.15),
    0 2px 4px -1px rgba(203, 213, 225, 0.10);
}

.card-back-pattern {
  width: 90%;
  height: 90%;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: 
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 8px,
      rgba(160, 174, 192, 0.15) 8px,
      rgba(160, 174, 192, 0.15) 16px
    );
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-back-symbol {
  font-size: 2rem;
  color: #64748b;
}
</style>
