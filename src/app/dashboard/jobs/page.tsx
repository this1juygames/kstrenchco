<div className={styles.navGroup}>
            {!userId ? (
              <>
                <button
                  onClick={() => router.push('/login?mode=signin')}
                  className={styles.secondaryBtn}
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push('/login?mode=signup')}
                  className={styles.primaryBtn}
                >
                  Register as Sub
                </button>
              </>
            ) : userRole === 'Admin' ? (
              <button
                onClick={() => router.push('/admin/subcontractors')}
                className={styles.yellowBadgeBtn}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Back to Admin Command Dashboard</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push('/onboarding')}
                  className={styles.secondaryBtn}
                >
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline">Qualification Profile</span>
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className={styles.primaryBtn}
                >
                  Compliance & Invoices
                </button>
              </>
            )}
          </div>